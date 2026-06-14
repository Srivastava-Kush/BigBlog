import { GraphQLScalarType, Kind } from "graphql";
import { GraphQLError } from "graphql";
import { nanoid } from "nanoid";
import Blog from "../Schema/Blog.js";
import User from "../Schema/User.js";
import Comment from "../Schema/Comment.js";

const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
        try { return JSON.parse(ast.value); } catch { return ast.value; }
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.NULL:
        return null;
      case Kind.LIST:
        return ast.values.map((v) => resolvers.JSON.parseLiteral(v));
      case Kind.OBJECT: {
        const obj = {};
        ast.fields.forEach((f) => {
          obj[f.name.value] = resolvers.JSON.parseLiteral(f.value);
        });
        return obj;
      }
      default:
        return null;
    }
  },
});

const resolvers = {
  JSON: JSONScalar,

  Query: {
    posts: async (_, { page = 1 }) => {
      const LIMIT = 5;
      return Blog.find({ draft: false })
        .sort({ publishedAt: -1 })
        .skip((page - 1) * LIMIT)
        .limit(LIMIT);
    },

    post: async (_, { blog_id }) => {
      return Blog.findOneAndUpdate(
        { blog_id },
        { $inc: { "activity.total_reads": 1 } },
        { new: true }
      );
    },

    user: async (_, { username }) => {
      return User.findOne({ "personal_info.username": username }).select(
        "-personal_info.password -__v"
      );
    },

    comments: async (_, { blog_id }) => {
      const blog = await Blog.findOne({ blog_id });
      if (!blog) return [];
      return Comment.find({ blog_id: blog._id, isReply: false })
        .populate("commented_by", "personal_info")
        .sort({ commentedAt: -1 });
    },
  },

  Post: {
    author: async (parent) => {
      if (parent.author && parent.author.personal_info) return parent.author;
      return User.findById(parent.author).select("-personal_info.password -__v");
    },

    comments: async (parent) => {
      return Comment.find({ blog_id: parent._id, isReply: false })
        .populate("commented_by", "personal_info")
        .sort({ commentedAt: -1 });
    },
  },

  Comment: {
    commented_by: async (parent) => {
      if (parent.commented_by && parent.commented_by.personal_info)
        return parent.commented_by;
      return User.findById(parent.commented_by).select(
        "-personal_info.password -__v"
      );
    },
  },

  Mutation: {
    createPost: async (_, { title, des, banner, tags, content, draft = false }, { user }) => {
      if (!user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const blog_id =
        title.replace(/[^a-zA-Z0-9]/g, " ").replace(/\s+/g, "-").trim() +
        nanoid();

      const blog = await Blog.create({
        blog_id,
        title,
        des,
        banner,
        tags: tags ? tags.map((t) => t.toLowerCase()) : [],
        content: content || [],
        author: user,
        draft,
      });

      if (!draft) {
        await User.findByIdAndUpdate(user, {
          $inc: { "account_info.total_posts": 1 },
          $push: { blogs: blog._id },
        });
      } else {
        await User.findByIdAndUpdate(user, { $push: { blogs: blog._id } });
      }

      return blog;
    },

    addComment: async (_, { blog_id, comment }, { user }) => {
      if (!user) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const blog = await Blog.findOne({ blog_id });
      if (!blog) {
        throw new GraphQLError("Post not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const newComment = await Comment.create({
        blog_id: blog._id,
        blog_author: blog.author,
        comment,
        commented_by: user,
        isReply: false,
      });

      await Blog.findByIdAndUpdate(blog._id, {
        $push: { comments: newComment._id },
        $inc: {
          "activity.total_comments": 1,
          "activity.total_parent_comments": 1,
        },
      });

      return Comment.findById(newComment._id).populate(
        "commented_by",
        "personal_info"
      );
    },
  },
};

export default resolvers;
