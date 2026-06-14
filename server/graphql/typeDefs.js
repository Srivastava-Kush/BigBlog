const typeDefs = `#graphql
  scalar JSON

  type PersonalInfo {
    fullname: String
    email: String
    username: String
    bio: String
    profile_img: String
  }

  type Activity {
    total_likes: Int
    total_comments: Int
    total_reads: Int
    total_parent_comments: Int
  }

  type User {
    id: ID
    personal_info: PersonalInfo
    joinedAt: String
  }

  type Comment {
    id: ID
    comment: String
    commented_by: User
    commentedAt: String
    isReply: Boolean
  }

  type Post {
    id: ID
    blog_id: String
    title: String
    banner: String
    des: String
    content: JSON
    tags: [String]
    author: User
    activity: Activity
    comments: [Comment]
    draft: Boolean
    publishedAt: String
  }

  type Query {
    posts(page: Int): [Post]
    post(blog_id: String!): Post
    user(username: String!): User
    comments(blog_id: String!): [Comment]
  }

  type Mutation {
    createPost(
      title: String!
      des: String
      banner: String
      tags: [String]
      content: JSON
      draft: Boolean
    ): Post

    addComment(
      blog_id: String!
      comment: String!
    ): Comment
  }
`;

export default typeDefs;
