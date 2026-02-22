import { Link } from "react-router-dom";
import { getDay } from "../common/date";
import { useState } from "react";
import NotificationCommentField from "./notification-comment-field.component";

const NotificationCard = ({
  data,
  index,
  notificationState,
  setNotificationState,
}) => {
  let {
    blog: { title, blog_id },
    replied_on_comment,
    type,
    comment,
    createdAt,
    user: {
      personal_info: { profile_img, fullname, username },
    },
  } = data;
  const [isReplying, setIsReplying] = useState(false);

  const handleReplyClick = () => {
    setIsReplying((prevVal) => !prevVal);
  };

  return (
    <div className="p-6 border-b border-grey border-l-black ">
      <div className="flex gap-5 mb-3">
        <img src={profile_img} className="w-14 h-14 flex-none rounded-full" />
        <div className="w-full">
          <h1 className="font-medium text-xl text-dark-grey">
            <span className="lg:inline-block hidden">{fullname}</span>
            <Link
              to={`/user/${username}`}
              className="mx-1 text-black underline"
            >
              @{username}
            </Link>
            <span className="font-normal">
              {type == "like"
                ? "liked your blog"
                : type == "comment"
                  ? "commented on"
                  : "replied on"}
            </span>
          </h1>
          {type == "reply" ? (
            <div className="p-4 mt-4 bg-grey rounded-md">
              <p>{replied_on_comment.comment}</p>
            </div>
          ) : (
            <>
              <Link
                to={`/blog/${blog_id}`}
                className="font-medium line-clamp-1 hover:underline text-dark-grey"
              >
                {" "}
                {`"${title}"`}
              </Link>
            </>
          )}
        </div>
      </div>
      {type != "like" ? (
        <p className="ml-14 pl-5 font-gelasio text-xl my-5">
          {comment.comment}
        </p>
      ) : (
        ""
      )}
      <div className="ml-14 pl-5 mt-3 text-dark-grey flex gap-8">
        <p>{getDay(createdAt)}</p>
        {type != "like" ? (
          <>
            <button
              className="hover:text-black underline"
              onClick={handleReplyClick}
            >
              Reply
            </button>
            <button className="hover:text-black underline">Delete</button>
          </>
        ) : (
          ""
        )}
      </div>

      {isReplying ? (
        <div className="mt-8">
          <NotificationCommentField></NotificationCommentField>
        </div>
      ) : (
        ""
      )}
    </div>
  );
};
export default NotificationCard;
