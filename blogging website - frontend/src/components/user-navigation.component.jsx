import { useContext } from "react";
import AnimationWrapper from "../common/page-animation";
import { Link } from "react-router-dom";
import { UserContext } from "../App";
import { logOutUser, reemoveFromSession } from "../common/session";

const UserNavigationPanel = () => {
  let {
    userAuth: { username },
    setUserAuth,
  } = useContext(UserContext);

  const signOutUser = () => {
    logOutUser();
    setUserAuth({ access_token: null });
  };

  return (
    <AnimationWrapper
      transition={{ duration: 0.2 }}
      className="absolute right-0 z-50"
    >
      <div className="bg-white border border-grey absolute right-0  w-60 duration-200">
        <Link to="/editor" className="flex gap-2 link md:hidden pl-8 py-4">
          <i className="fi fi-rr-edit"></i>
          <p>Write</p>
        </Link>

        <Link to={`/user/${username}`} className="link  pl-8 py-4">
          Profile
        </Link>
        <Link to="/dashboard/blogs" className="link  pl-8 py-4">
          Dashboard
        </Link>
        <Link to="/settings/edit-profile" className="link  pl-8 py-4">
          Settings
        </Link>
        <span className="absolute border-t border-grey w-[100%]  pl-8 py-4">
          <button
            className="hover:bg-grey  p-4 pl-8 py-4 text-left"
            onClick={signOutUser}
          >
            <h1 className="text-bold text-xl mg-1">Sign Out</h1>
            <p className="text-dark-grey">{`@${username}`}</p>
          </button>
        </span>
      </div>
    </AnimationWrapper>
  );
};
export default UserNavigationPanel;
