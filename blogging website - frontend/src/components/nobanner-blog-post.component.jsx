import { Link } from "react-router-dom";
import { getDay } from "../common/date";

const MinimalBlogPost = ({ blog, index }) => {
  let {
    title,
    des,
    blog_id: id,
    author: {
      personal_info: { fullname, username, profile_img },
    },
    publishedAt,
  } = blog;

  return (
    <Link to={`/blog/${id}`} className="flex gap-5 mb-4">
      <h1 className="blog-index"> {index < 10 ? "0" + (index + 1) : index} </h1>
      <div>
        <div className="flex gap-4 items-center mb-7">
          <img src={profile_img} className="rounded-full w-6 h-6" />
          <p className="line-clamp-1">
            {fullname}@{username}
          </p>
          <p className="min-w-fit">{getDay(publishedAt)}</p>
        </div>
        <h1>{title}</h1>
      </div>
    </Link>
  );
};
export default MinimalBlogPost;
