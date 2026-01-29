import { Link } from "react-router-dom";
import { getDay } from "../common/date";

const BlogPostCard = ({ content, author }) => {
  let {
    publishedAt,
    tags,
    title,
    des,
    activity: { total_likes },
    banner,
    blog_id: id,
  } = content;
  //renaming blog_id to id
  let { profile_img, fullname, username } = author;
  return (
    <Link
      to={`/blogs/${id}`}
      className="flex gap-8 items-center border-b border-grey pb-5 mb-4"
    >
      <div className="w-full">
        <div className="flex gap-4 items-center mb-7">
          <img src={profile_img} className="rounded-full w-6 h-6" />
          <p className="line-clamp-1">
            {fullname}@{username}
          </p>
          <p className="min-w-fit">{getDay(publishedAt)}</p>
        </div>
        <h1 className="blog-title">{title}</h1>
        <p className="my-3 text-xl font-gelasio leading-7 max-sm:hidden md:max-[1100px]:hidden line-clamp-2">
          {des}
        </p>
        <div className="flex mt-7 gap-2">
          <span className="btn-light py-1 px-4">{tags[0]}</span>
          <span className="ml-3 flex  items-center gap-2 text-dark-grey">
            <i className="fi fi-rr-heart text-xl"></i>
            {total_likes}
          </span>
        </div>
      </div>
      <div className="h-28 aspect-square bg-grey ">
        <img
          src={banner}
          className="w-full h-full aspect-square object-cover"
        ></img>
      </div>
    </Link>
  );
};
export default BlogPostCard;
