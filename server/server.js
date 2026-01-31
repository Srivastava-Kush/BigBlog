import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import User from "./Schema/User.js";
import jwt from "jsonwebtoken";
import cors from "cors";
import admin from "firebase-admin";
// import serviceAccountKey from "./bigblog-3e96f-firebase-adminsdk-fbsvc-fd79b68a59.json" assert { type: "json" };
import { getAuth } from "firebase-admin/auth";
import cloudinary from "./config/cloudinary.js";
import Blog from "./Schema/Blog.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  let { title, tags, des, banner, content, draft } = req.body;

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
    title
      .replace(/[^a-zA-Z0-9]/g, " ")
      .replace(/\s+/g, "-")
      .trim() + nanoid();
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
  let { blog_id } = req.body;
  let incrementVal = 1;
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
      return res.status(200).json({ blog });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});
app.listen(PORT_NUMBER, () => {
  console.log("listening on port ->" + PORT_NUMBER);
});
