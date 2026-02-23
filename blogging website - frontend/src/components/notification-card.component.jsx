import { Link } from "react-router-dom";
import { getDay } from "../common/date";
import { useContext, useState } from "react";
import NotificationCommentField from "./notification-comment-field.component";
import { UserContext } from "../App";

const NotificationCard = ({
  data,
  index,
  notificationState,
  setNotificationState,
}) => {
  console.log(data);
  let {
    blog: { _id, title, blog_id },
    replied_on_comment,
    type,
    comment,
    createdAt,
    reply,
    user,
    user: {
      personal_info: { profile_img, fullname, username },
    },
    _id: notification_id,
  } = data;

  let {
    userAuth: {
      access_token,
      profile_img: author_profile_img,
      username: author_username,
    },
  } = useContext(UserContext);

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
            {!reply ? (
              <button
                className="hover:text-black underline"
                onClick={handleReplyClick}
              >
                Reply
              </button>
            ) : (
              ""
            )}
            <button className="hover:text-black underline">Delete</button>
          </>
        ) : (
          ""
        )}
      </div>

      {isReplying ? (
        <div className="mt-8">
          <NotificationCommentField
            _id={_id}
            blog_author={user}
            index={index}
            replyingTo={comment._id}
            setReplying={setIsReplying}
            notification_id={notification_id}
            notificationData={notificationState}
          ></NotificationCommentField>
        </div>
      ) : (
        ""
      )}

      {reply ? (
        <div className="ml-20 p-5 bg-grey mt-5 rounded-md">
          <div className="flex gap-3 mb-3">
            <img
              src={author_profile_img}
              className="w-8 h-8 rounded-full"
            ></img>
            <div>
              <h1>
                <Link
                  to={`/user/${author_username}`}
                  className="mx-1 tex-black underline"
                >
                  @{author_username}
                </Link>
                <span className="font-normal">replied to</span>
                <Link
                  to={`/user/${username}`}
                  className="mx-1 text-black underline"
                >
                  {username}
                </Link>
              </h1>
            </div>
          </div>
          <p className="ml-14 font-gelasio text-xl my-2">{reply.comment}</p>
        </div>
      ) : (
        ""
      )}
    </div>
  );
};
export default NotificationCard;
