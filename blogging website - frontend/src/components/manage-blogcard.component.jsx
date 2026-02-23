import { Link } from "react-router-dom";
import { getDay } from "../common/date.jsx";
import { useContext, useState } from "react";

import { UserContext } from "../App.jsx";
import axios from "axios";

const BlogStats = ({ stats }) => {
  return (
    <div className="flex gap-2 mb-6 max-lg:pb-6 border-grey max-lg:border-b">
      {Object.keys(stats).map((key, i) => {
        return !key.includes("parent") ? (
          <div
            key={i}
            className={
              "flex flex-col items-center w-full h-full justify-center p-4 px-6 " +
              (i !== 0 ? " border-grey border-l" : "")
            }
          >
            <h1 className="max-lg:text-dark-grey capitalize">
              {stats[key].toLocaleString()}
            </h1>
            <p>{key.split("_")[1]}</p>
          </div>
        ) : (
          ""
        );
      })}
    </div>
  );
};

const deleteBlog = (blog, access_token, target) => {
  let { index, blog_id, setStateFunction } = blog;
  target.setAttribute("disabled", true);

  axios
    .post(
      import.meta.env.VITE_SERVER_DOMAIN + "/delete-blog",
      {
        blog_id,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    )
    .then(({ data }) => {
      target.removeAttribute("disabled");

      setStateFunction((prevVal) => {
        let { deletedDocCount, totalDocs, results } = prevVal;

        results.splice(index, 1);
        if (!results.length && totalDocs - 1 > 0) {
        }
      });
    });
};

export const ManagePublishedBlogCard = ({ blog }) => {
  let { title, des, banner, blog_id, publishedAt, activity } = blog;
  let {
    userAuth: { access_token },
  } = useContext(UserContext);

  const [showStats, setShowStats] = useState(false);

  console.log(showStats);

  return (
    <>
      <div className="flex gap-10 border-b mb-6 max-md:px-4 border-grey pb-6 items-center">
        <img
          src={banner}
          className="max-md:hidden lg:hidden xl:block w-28 h-28 flex-none bg-grey object-cover "
        />
        <div className="flex flex-col justify-between py-2 w-full min-w-[300px]">
          <div>
            <Link
              to={`/blog/${blog_id}`}
              className="blog-title mb-4 hover:underline "
            >
              {title}
            </Link>
            <p>Published On {getDay(publishedAt)}</p>
            <div className="flex gap-6 mt-5">
              <Link to={`/editor/${blog_id}`} className="px-4 py-2 underline">
                Edit
              </Link>
              <button
                onClick={() => {
                  setShowStats((prevVal) => !prevVal);
                }}
                className="lg:hidden underline px-4 py-2"
              >
                Stats
              </button>
              <button
                className="pr-4 py-2 underline text-red"
                onClick={(e) => deleteBlog(blog, access_token, e.target)}
              >
                Delete
              </button>
            </div>
          </div>
          <div className="max-lg:hidden">
            <BlogStats stats={activity} />
          </div>{" "}
        </div>{" "}
        {showStats ? (
          <div className="lg:hidden ">
            <BlogStats stats={activity}></BlogStats>
          </div>
        ) : (
          ""
        )}
      </div>
    </>
  );
};

export const ManageDraftBlogPost = ({ blog }) => {
  let { title, des, blog_id, index } = blog;

  let {
    userAuth: { access_token },
  } = useContext(UserContext);
  index++;
  return (
    <div className="flex gap-5 lg:gap-10 pb-6 border-b mb-6 border-grey">
      <h1 className="blog-index text-center pl-4 nd:pl-6 flex-none">
        {index < 10 ? "0" + index : index}
      </h1>
      <div>
        <h1 className="blog-title mb-3">{title}</h1>
        <p className="line-clamp-2 font-gelasio">
          {des.length ? des : "No Description"}
        </p>
        <div className="flex gap-6 mt-3 ">
          <Link to={`/editor/${blog_id}`}>Edit</Link>
          <button
            className="pr-4 py-2 underline text-red"
            onClick={(e) => deleteBlog(blog, access_token, e.target)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
