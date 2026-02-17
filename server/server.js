import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import bcrypt, { compare } from "bcrypt";
import { nanoid } from "nanoid";
import User from "./Schema/User.js";
import Notification from "./Schema/Notification.js";
import Comment from "./Schema/Comment.js";
import Blog from "./Schema/Blog.js";
import jwt from "jsonwebtoken";
import cors from "cors";
import admin from "firebase-admin";
// import serviceAccountKey from "./bigblog-3e96f-firebase-adminsdk-fbsvc-fd79b68a59.json" assert { type: "json" };
import { getAuth } from "firebase-admin/auth";
import cloudinary from "./config/cloudinary.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { populate } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountKey = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      "bigblog-3e96f-firebase-adminsdk-fbsvc-fd79b68a59.json",
    ),
    "utf-8",
  ),
);

const app = express();
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});
mongoose.connect(process.env.DB_LOCATION, { autoIndex: true });
app.use(express.json());
app.use(cors());
let PORT_NUMBER = 3000;
let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

//We get access token from "Authorization" Header
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; //Structure :Bearer access_token
  if (token == null) {
    return res.status(401).json({ error: "No access token" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Acess token is invalid" });
    }

    req.user = user.id;
    next();
  });
};

const generateUploadURL = () => {
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `blogs/${Date.now()}-${nanoid(10)}`;
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      public_id: publicId,
    },
    process.env.CLOUDINARY_API_SECRET,
  );

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    timestamp,
    publicId,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
  };
};

const formatDatatoSend = (user) => {
  const access_token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  return {
    access_token,
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname,
  };
};

const generateUsername = async (email) => {
  let username = email.split("@")[0];
  let isUsernameNotUnique = await User.exists({
    "personal_info.username": username,
  }).then((result) => result);

  isUsernameNotUnique ? (username += nanoid()).substring(0, 10) : "";
  return username;
};

//enables json sharing and accepts json data
app.post("/signup", (req, res) => {
  const { fullname, email, password } = req.body;
  //validating data from frontend
  if (fullname.length < 3) {
    return res
      .status(403)
      .json({ error: "Fullname must atleast 3 chars long" });
  }
  if (!email.length) {
    return res.status(403).json({ error: "Please enter your email!" });
  }
  if (!emailRegex.test(email)) {
    return res.status(403).json({ error: "Enter valid email" });
  }
  if (!passwordRegex.test(password)) {
    return res.status(403).json({ error: "Invalid Password" });
  }

  bcrypt.hash(password, 10, async (err, hashed_password) => {
    let username = await generateUsername(email);

    let user = new User({
      personal_info: { fullname, email, password: hashed_password, username },
    });

    user
      .save()
      .then((u) => {
        return res.status(200).json(formatDatatoSend(u));
      })
      .catch((err) => {
        if (err.code == 11000) {
          return res.status(500).json({ error: "Email already exists" });
        }
        return res.status(500).json({ error: err.message });
      });
  });
});

app.post("/signin", (req, res) => {
  let { email, password } = req.body;

  User.findOne({ "personal_info.email": email })
    .then((user) => {
      if (!user) {
        return res.status(403).json({ error: "Email not found" });
      }

      bcrypt.compare(password, user.personal_info.password, (err, result) => {
        if (err) {
          return res
            .status(403)
            .json({ error: "Error occured while login try again" });
        }

        if (!result) {
          return res.status(403).json({ error: "Incorrect Password" });
        } else {
          return res.status(200).json(formatDatatoSend(user));
        }
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
});

app.post("/google-auth", async (req, res) => {
  let { access_token } = req.body;
  getAuth()
    .verifyIdToken(access_token)
    .then(async (decodedUser) => {
      let { email, name, picture } = decodedUser;

      picture = picture.replace("s96-c", "s84-c");
      let user = await User.findOne({ "personal_info.email": email })
        .select(
          "personal_info.fullname personal_info.email personal_info.profile_img google_auth",
        )
        .then((u) => {
          return u || null;
        })
        .catch((err) => {
          return res.status(500).json({ error: err.message });
        });

      if (user) {
        if (!user.google_auth) {
          return res.status(403).json({
            error:
              "This email was signed in w/o google. Please login using password",
          });
        }
      } else {
        let username = await generateUsername(email);
        user = new User({
          personal_info: {
            fullname: name,
            email,
            // profile_img: picture,
            username,
          },
          google_auth: true,
        });

        await user
          .save()
          .then((u) => {
            user = u;
          })
          .catch((err) => {
            return res.status(500).json({ error: err.message });
          });
      }

      return res.status(200).json(formatDatatoSend(user));
    })
    .catch((err) => {
      return res.status(500).json({
        error: "Failed to authenticate with google . Try other method!!",
      });
    });
});

app.get("/get-upload-url", (req, res) => {
  try {
    console.log("Cloudinary Config:", {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY ? "✓ Set" : "✗ Missing",
      apiSecret: process.env.CLOUDINARY_API_SECRET ? "✓ Set" : "✗ Missing",
    });
    const uploadData = generateUploadURL();
    console.log(uploadData);
    res.json(uploadData);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate upload Url" });
  }
});

app.post("/latest-blogs", (req, res) => {
  let { page } = req.body;

  let maxLimit = 5;
  Blog.find({ draft: false })
    .populate(
      "author",
      "personal_info.fullname personal_info.profile_img personal_info.username -_id",
    )
    .sort({ publishedAt: -1 })
    .select("blog_id title  des tags banner activity publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

app.get("/trending-blogs", (req, res) => {
  Blog.find({ draft: false })
    .populate(
      "author",
      "personal_info.fullname personal_info.profile_img personal_info.username -_id",
    )
    .sort({
      "activity.total_read": -1,
      "activity.total_likes": -1,
      publishedAt: -1,
    })
    .select("blog_id title publishedAt -_id")
    .limit(5)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

app.post("/search-blogs", (req, res) => {
  let { tag, page, author, query, limit, eliminate_blog } = req.body;
  let findQuery;
  if (tag) {
    findQuery = {
      tags: { $in: [tag] },
      draft: false,
      blog_id: { $ne: eliminate_blog },
    };
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") };
  } else if (author) {
    findQuery = { author, draft: false };
  }

  let maxLimit = limit ? limit : 2;
  Blog.find(findQuery)
    .populate(
      "author",
      "personal_info.fullname personal_info.profile_img personal_info.username -_id",
    )
    .sort({ publishedAt: -1 })
    .select("blog_id title  des tags banner activity publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

//middleware to check authorization and validation. If validated we can call next() to go to (req,res)=>{} function
app.post("/create-blog", verifyJWT, (req, res) => {
  let authorId = req.user;
  let { title, tags, des, banner, content, draft, id } = req.body;

  //Server-side validation of the structure of the blog
  if (!title.length) {
    res
      .status(403)
      .json({ error: "You must provide a title to publish the blog." });
  }

  if (!draft) {
    if (!des.length || des.length > 200) {
      res
        .status(403)
        .json({ error: "You must provide a description with word limit." });
    }
    if (!banner.length) {
      res
        .status(403)
        .json({ error: "You must provide a banner to publish the blog." });
    }
    if (!content.blocks.length) {
      res
        .status(403)
        .json({ error: "You must provide some content to publish the blog." });
    }
    if (!tags.length || tags.length > 10) {
      res.status(403).json({ error: "Provide tags to publish the blog." });
    }
  }

  tags = tags.map((tag) => tag.toLowerCase());
  //We create a different id for blog. so that when we make get /blog{blog_id} requests we dont make system susceptible to .... and yk security thing.
  //so new id :D=>
  let blog_id =
    id ||
    title
      .replace(/[^a-zA-Z0-9]/g, " ")
      .replace(/\s+/g, "-")
      .trim() + nanoid();

  if (id) {
    Blog.findOneAndUpdate(
      { blog_id: id },
      { title, des, banner, content, tags, draft: draft ? draft : false },
    )
      .then((blog) => {
        return res.status(200).json({ id: blog_id });
      })
      .catch((err) => {
        return res
          .status(500)
          .json({ error: "Failed to update total posts number" });
      });
  } else {
    let blog = new Blog({
      title,
      des,
      banner,
      content,
      tags,
      author: authorId,
      blog_id,
      draft: Boolean(draft),
    });
    blog
      .save()
      .then((blog) => {
        //We need to add account_info of User (author) and blog_id to blogs of that author
        let incrementVal = draft ? 0 : 1;
        User.findOneAndUpdate(
          { _id: authorId },
          {
            $inc: { "account_info.total_posts": incrementVal },
            $push: { blogs: blog._id },
          },
        )
          .then((user) => {
            return res.status(200).json({ id: blog.blog_id });
          })
          .catch((err) => {
            return res
              .status(500)
              .json({ error: "Failed to update total posts number." });
          });
      })
      .catch((err) => {
        res.status(500).json({ error: err.message });
      });
  }
});

app.post("/all-latest-blogs-count", (req, res) => {
  Blog.countDocuments({ draft: false })
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

app.post("/search-blogs-count", (req, res) => {
  let { tag, page, author, query } = req.body;
  let findQuery;
  if (tag) {
    findQuery = { tags: tag, draft: false };
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") };
  } else if (author) {
    findQuery = { author, draft: false };
  }
  Blog.countDocuments(findQuery)
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

app.post("/search-users", (req, res) => {
  let { query } = req.body;
  User.find({ "personal_info.username": new RegExp(query, "i") })
    .limit(50)
    .select(
      "personal_info.fullname personal_info.profile_img personal_info.username -_id",
    )
    .then((users) => {
      return res.status(200).json({ users });
    })
    .catch((err) => {
      return res.status.json({ error: err.message });
    });
});

app.post("/get-profile", (req, res) => {
  let { username } = req.body;
  User.findOne({ "personal_info.username": username })
    .select("-personal_info.password -google_auth -updatedAt -blogs")
    .then((users) => {
      return res.status(200).json(users);
    })
    .catch((err) => {
      return res.status.json({ error: err.message });
    });
});
//if draft not provided . then draft becomes false(Boolean(undefined)=false) and if we provided anything it becomes true

app.post("/get-blog", (req, res) => {
  let { blog_id, mode, draft } = req.body;
  let incrementVal = mode != "edit" ? 1 : 0;
  //We use update as we need to increment total_reads : D
  Blog.findOneAndUpdate(
    { blog_id },
    { $inc: { "activity.total_reads": incrementVal } },
  )
    .populate(
      "author",
      "personal_info.fullname personal_info.username personal_info.profile_img",
    )
    .select("title des banner activity content publishedAt blog_id tags")
    .then((blog) => {
      User.findOneAndUpdate(
        { "personal_info.username": blog.author.personal_info.username },
        { $inc: { "account_info.total_reads": incrementVal } },
      ).catch((err) => {
        return res.status(500).json({ error: err.message });
      });

      if (blog.draft && !draft) {
        return res.status(500).json({ error: "You cannot access draft blogs" });
      }
      return res.status(200).json({ blog });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

app.post("/like-blog", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { _id, isLikedByUser } = req.body;

  let incrementVal = !isLikedByUser ? 1 : -1;
  Blog.findOneAndUpdate(
    { _id },
    { $inc: { "activity.total_likes": incrementVal } },
  ).then((blog) => {
    console.log(blog);

    if (!isLikedByUser) {
      let like = new Notification({
        type: "like",
        blog: _id,
        notification_for: blog.author,
        user: user_id,
      });

      like.save().then((notification) => {
        return res.status(200).json({ liked_by_user: true });
      });
    } else {
      Notification.findOneAndDelete({ user: user_id, blog: _id, type: "like" })
        .then((data) => {
          return res.status(200).json({ liked_by_user: false });
        })
        .catch((err) => {
          res.status(500).json({ error: err.message });
        });
    }
  });
});

app.post("/isliked-by-user", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { _id } = req.body;

  Notification.exists({ user: user_id, type: "like", blog: _id })
    .then((result) => {
      return res.status(200).json({ result });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

app.post("/add-comment", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { _id, comment, blog_author, replying_to } = req.body;

  if (!comment.length) {
    return res
      .status(403)
      .json({ error: "Write Something to leave a comment." });
  }

  //creating a comment now :
  let commentObj = {
    blog_id: _id,
    blog_author,
    comment,
    commented_by: user_id,
  };

  if (replying_to) {
    commentObj.parent = replying_to;
    commentObj.isReply = true;
  }

  new Comment(commentObj).save().then(async (commentFile) => {
    let { comment, commentedAt, children } = commentFile;

    Blog.findOneAndUpdate(
      { _id },
      {
        $push: { comments: commentFile._id },
        $inc: {
          "activity.total_comments": 1,
          "activity.total_parent_comments": replying_to ? 0 : 1,
        },
      },
    ).then((blog) => console.log("New comment created."));

    let notificationObj = {
      type: replying_to ? "reply" : "comment",
      blog: _id,
      notification_for: blog_author,
      user: user_id,
      comment: commentFile._id,
    };

    if (replying_to) {
      notificationObj.replied_on_comment = replying_to;
      await Comment.findOneAndUpdate(
        { _id: replying_to },
        { $push: { children: commentFile._id } },
      ).then((replyingToCommentDoc) => {
        notificationObj.notification_for = replyingToCommentDoc.commented_by;
      });
    }

    new Notification(notificationObj)
      .save()
      .then((notification) => console.log("notif created"));
    return res.status(200).json({
      comment,
      commentedAt,
      _id: commentFile._id,
      user_id,
      children,
    });
  });
});

app.post("/get-blog-comments", (req, res) => {
  let { blog_id, skip } = req.body;
  let maxLimit = 5;

  Comment.find({ blog_id, isReply: false })
    .populate(
      "commented_by",
      "personal_info.username personal_info.fullname personal_info.profile_img",
    )
    .skip(skip)
    .limit(maxLimit)
    .sort({
      commentedAt: -1,
    })
    .then((comment) => {
      return res.status(200).json(comment);
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

app.post("/get-replies", (req, res) => {
  let { _id, skip } = req.body;
  let maxLimit = 2;
  Comment.findOne({ _id })
    .populate({
      path: "children",
      options: {
        limit: maxLimit,
        skip: skip,
        sort: { commentedAt: -1 },
      },
      populate: {
        path: "commented_by",
        select:
          "personal_info.profile_img personal_info.fullname personal_info.username",
      },
      select: "-blog_is -updatedAt",
    })
    .select("children")
    .then((doc) => {
      return res.status(200).json({ replies: doc.children });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

const deleteComments = (_id) => {
  Comment.findOneAndDelete({ _id })
    .then((comment) => {
      if (comment.parent) {
        Comment.findOneAndUpdate(
          { _id: comment.parent },
          { $pull: { children: _id } },
        )
          .then((data) => console.log("comment deleted", data))
          .catch((err) => console.log(err));
      }

      Notification.findOneAndDelete({ comment: _id }).then((notif) =>
        console.log("notify of comment deleted"),
      );
      Notification.findOneAndDelete({ reply: _id }).then((notif) =>
        console.log("notify of reply deleted"),
      );

      Blog.findOneAndUpdate(
        { _id: comment.blog_id },
        {
          $pull: { comments: _id },
          $inc: { "activity.total_comments": -1 },
          "activity.total_parent_comments": comment.parent ? 0 : 1,
        },
      ).then((blog) => {
        if (comment.children.length) {
          comment.children.map((replies) => {
            deleteComments(replies);
          });
        }
      });
    })
    .catch((err) => {
      console.log(err.message);
    });
};

app.post("/delete-comment", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { _id } = req.body;

  Comment.findOne({ _id }).then((comment) => {
    if (user_id == comment.commented_by || user_id == comment.blog_author) {
      deleteComments(_id);

      return res.status(200).json({ status: "done" });
    } else {
      return res.status(403).json({ error: "You cannot delete this comment" });
    }
  });
});

app.post("/change-password", verifyJWT, (req, res) => {
  let { currentPassword, newPassword } = req.body;

  if (
    !passwordRegex.test(currentPassword) ||
    !passwordRegex.test(newPassword)
  ) {
    return res.status(403).json({
      error:
        "Password must be 6-20 characters and 1 uppercase,1 numeric,1 lowercase",
    });
  }

  User.findOne({ _id: req.user })
    .then((user) => {
      if (user.google_auth) {
        return res.status(403).json({
          error:
            "You cannot change password because you logged in through frontend",
        });
      }

      bcrypt.compare(
        currentPassword,
        user.personal_info.password,
        (err, result) => {
          if (err) {
            return res.status(500).json({
              error:
                "Some error occured while changing password, please try again.",
            });
          }
          if (!result) {
            return res
              .status(403)
              .json({ erro: "Incorrect current password." });
          }

          bcrypt.hash(newPassword, 10, (err, hashed_password) => {
            User.findOneAndUpdate(
              { _id: req.user },
              {
                "personal_info.password": hashed_password,
              },
            )
              .then((user) => {
                return res
                  .status(200)
                  .json({ status: "password changed successfully" });
              })
              .catch((err) => {
                return res.status(500).json({
                  error:
                    "Some error occcured while saving new password , try again",
                });
              });
          });
        },
      );
    })
    .catch((err) => {
      return res.status(403).json({ error: "Couldn't find user" });
    });
});

app.post("/update-profile-img", verifyJWT, (req, res) => {
  let { url } = req.body;
  User.findOneAndUpdate(
    { _id: req.user },
    {
      "personal_info.profile_img": url,
    },
  )
    .then(() => {
      return res.status(200).json({ profile_img: url });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

app.post("/update-profile", verifyJWT, (req, res) => {
  let { username, bio, social_links } = req.body;
  let bioLimit = 200;
  if (username.length < 3) {
    return res
      .status(403)
      .json({ error: "Username should be atleast 3 characters long" });
  }
  if (bio.length > bioLimit) {
    return res
      .status(403)
      .json({ error: "Bio should be under limit of characters" });
  }

  let socialLinksArr = Object.keys(social_links);

  try {
    for (let i = 0; i < socialLinksArr.length; i++) {
      if (social_links[socialLinksArr[i]].length) {
        let hostname = new URL(social_links[socialLinksArr[i]]).hostname;

        if (
          hostname.includes(
            `${socialLinksArr[i]}.com` && socialLinksArr[i] != "website",
          )
        ) {
          return res
            .status(403)
            .json({ error: "Enter a valid URL for social_links" });
        }
      }
    }
  } catch (err) {
    return res.status(500).json({
      error: "You must provide full social links with http(s) included",
    });
  }

  let updateObj = {
    "personal_info.username": username,
    "personal_info.bio": bio,
    social_links,
  };

  User.findOneAndUpdate({ _id: req.user }, updateObj, { runValidators: true })
    .then(() => {
      return res.status(200).json({ username });
    })
    .catch((error) => {
      if (error.code == 11000) {
        return res.status(403).json({ error: "username is already taken" });
      }
      return res.status(500).json({ error: err.message });
    });
});

app.listen(PORT_NUMBER, () => {
  console.log("listening on port ->" + PORT_NUMBER);
});
