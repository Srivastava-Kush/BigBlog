import { useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import axios from "axios";
import { profileDataStructure } from "./profile.page";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import { Toaster, toast } from "react-hot-toast";
import InputBox from "../components/input.component";

const EditProfile = () => {
  let {
    userAuth,
    userAuth: { access_token },
  } = useContext(UserContext);

  const [profile, setProfile] = useState(profileDataStructure);
  const [loading, setLoading] = useState(true);

  let {
    personal_info: {
      username: profile_username,
      fullname,
      profile_img,
      bio,
      email,
    },
    account_info: { total_posts, total_reads },
    social_links,
    joinedAt,
  } = profile;
  useEffect(() => {
    if (access_token) {
      axios
        .post(import.meta.env.VITE_SERVER_DOMAIN + "/get-profile", {
          username: userAuth.username,
        })
        .then(({ data }) => {
          setProfile(data);
          setLoading(false);
        })
        .catch((err) => console.log(err));
    }
  }, [access_token]);

  return (
    <AnimationWrapper>
      {loading ? (
        <Loader />
      ) : (
        <form>
          <Toaster />
          <h1 className="max-md:hidden">Edit Profile</h1>
          <div className="flex flex-col lg:flex-row items-start py-10 gap-8 lg:gap-10">
            <div className="max-lg:center mb-5">
              <label
                className="w-48 h-48 bg-grey rounded-full overflow-hidden relative block"
                htmlFor="uploading"
                id="profileImgLabel"
              >
                <img src={profile_img} />
                <div className="w-full h-full absolute top-0 left-0 flex items-center justify-center text-white bg-black/30 opacity-0 hover:opacity-100 cursor-pointer">
                  Upload Image
                </div>
              </label>
              <input
                type="file"
                id="uploading"
                accept=".jpg, .jpeg, .png"
                hidden
              ></input>
              <button className="btn-light mt-5 max-lg:center lg:w-full px-10">
                Upload
              </button>
            </div>
            <div className="w-full ">
              <div className="grid grid-cols-1 md:grid-cols-2 md:gap-5">
                <div>
                  <InputBox
                    name="fullname"
                    type="text"
                    value={fullname}
                    placeholder="Fullname"
                    disable={true}
                    icon="fi-rr-user"
                  />
                  <InputBox
                    name="email"
                    type="email"
                    value={email}
                    placeholder="Email"
                    disable={true}
                    icon="fi-rr-envelope"
                  />
                </div>
              </div>

              <InputBox
                type="text"
                name="username"
                value={profile_username}
                placeholder="Username"
                icon="fi-rr-at"
              />
            </div>
          </div>
        </form>
      )}
    </AnimationWrapper>
  );
};

export default EditProfile;
