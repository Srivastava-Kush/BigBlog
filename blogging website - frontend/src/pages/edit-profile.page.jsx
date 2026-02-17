import { useContext, useEffect, useRef, useState } from "react";
import { UserContext } from "../App";
import axios from "axios";
import { profileDataStructure } from "./profile.page";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import { Toaster, toast } from "react-hot-toast";
import InputBox from "../components/input.component";
import { Link } from "react-router-dom";
import { uploadImage } from "../common/cloudinaryUpload";
import { storeInSession } from "../common/session";

const EditProfile = () => {
  let bioLimit = 150;
  let {
    userAuth,
    userAuth: { access_token },
    setUserAuth,
  } = useContext(UserContext);

  const [profile, setProfile] = useState(profileDataStructure);
  const [loading, setLoading] = useState(true);
  const [charactersLeft, setCharactersLeft] = useState(bioLimit);
  const [updatedProfileImage, setUpdatedProfileImage] = useState(null);

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

  let profileImgElement = useRef();
  let formRef = useRef();

  const handleBioChange = (e) => {
    setCharactersLeft(bioLimit - e.target.value.length);
  };

  const handleImagePreview = (e) => {
    //in e.target.files[0] we get all the values of the particular files
    let img = e.target.files[0];

    profileImgElement.current.src = URL.createObjectURL(img);
    setUpdatedProfileImage(img);
  };

  const handleImageUpload = async (e) => {
    console.log("upload clicked");
    console.log(updatedProfileImage);
    e.preventDefault();

    if (updatedProfileImage) {
      console.log("upload clicked");
      let loadingToast = toast.loading("Uploading...");
      e.target.setAttribute("disabled", true);
      console.log("upload clicked");
      uploadImage(updatedProfileImage)
        .then((url) => {
          if (url) {
            axios
              .post(
                import.meta.env.VITE_SERVER_DOMAIN + "/update-profile-img",
                {
                  url,
                },
                {
                  headers: {
                    Authorization: `Bearer ${access_token}`,
                  },
                },
              )
              .then(({ data }) => {
                let newUserAuth = {
                  ...userAuth,
                  profile_img: data.profile_img,
                };
                storeInSession("user", JSON.stringify(newUserAuth));
                setUserAuth(newUserAuth);
                setUpdatedProfileImage(null);
                toast.dismiss(loadingToast);
                e.target.removeAttribute("disabled");
                toast.success("Uploaded");
              });
          }
        })
        .catch(({ response }) => {
          toast.dismiss(loadingToast);
          e.target.removeAttribute("disabled");
          toast.error(response.data.error);
        });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let form = new FormData(formRef.current);
    let formData = {};

    for (let [key, value] of form.entries()) {
      formData[key] = value;
    }

    let {
      username,
      bio,
      youtube,
      facebook,
      twitter,
      github,
      instagram,
      website,
    } = formData;

    if (username.length < 3) {
      return toast.error("Username should be atleast 3 chars long");
    }
    if (bio.length > bioLimit) {
      return toast.error(
        `You cannot enter more than ${bioLimit} characters in bio`,
      );
    }

    let loadingToast = toast.loading("Uploading...");
    e.target.setAttribute("disabled", true);
    axios
      .post(
        import.meta.env.VITE_SERVER_DOMAIN + "/update-profile",
        {
          username,
          bio,
          social_links: {
            youtube,
            twitter,
            facebook,
            github,
            instagram,
            website,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      )
      .then(({ data }) => {
        if (userAuth.username != data.username) {
          let newUserAuth = { ...userAuth, username: data.username };
          storeInSession("user", JSON.stringify(newUserAuth));
          setUserAuth(newUserAuth);
        }
        toast.dismiss(loadingToast);
        e.target.removeAttribute("disabled");
        toast.success("Profile Updated successfsully");
      })
      .catch(({ response }) => {
        toast.dismiss(loadingToast);
        e.target.removeAttribute("disabled");
        toast.error(response.data.error);
      });
  };

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
        <form ref={formRef}>
          <Toaster />
          <h1 className="max-md:hidden">Edit Profile</h1>
          <div className="flex flex-col lg:flex-row items-start py-10 gap-8 lg:gap-10">
            <div className="max-lg:center mb-5">
              <label
                className="w-48 h-48 bg-grey rounded-full overflow-hidden relative block"
                htmlFor="uploading"
                id="profileImgLabel"
              >
                <img src={profile_img} ref={profileImgElement} />
                <div className="w-full h-full absolute top-0 left-0 flex items-center justify-center text-white bg-black/30 opacity-0 hover:opacity-100 cursor-pointer">
                  Upload Image
                </div>
              </label>
              <input
                type="file"
                id="uploading"
                accept=".jpg, .jpeg, .png"
                hidden
                onChange={handleImagePreview}
              ></input>
              <button
                className="btn-light mt-5 max-lg:center lg:w-full px-10"
                onClick={handleImageUpload}
              >
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
              <p className="text-dark-grey -mt-3">
                Username will be used to search user and will be visible to
                others
              </p>
              <textarea
                name="bio"
                maxLength={bioLimit}
                className="input-box h-64 lg:h-40 resize-none leading-7 mt-5 pl-5"
                placeholder="Bio"
                onChange={handleBioChange}
              ></textarea>
              <p className="mt-1 text-dakr-grey">
                {charactersLeft} characters left
              </p>

              <p className="my-6 text-dark-grey">
                Add your social handles below
              </p>
              <div className="md:grid md:grid-cols-2 gap-x-6">
                {Object.keys(social_links).map((key, i) => {
                  let link = social_links[key];
                  return (
                    <InputBox
                      key={i}
                      name={key}
                      type="text"
                      values={link}
                      placeholder="https://"
                      icon={
                        "fi " +
                        (key != "website" ? "fi-brands-" + key : "fi-rr-globe")
                      }
                    />
                  );
                })}
              </div>
              <button
                onClick={handleSubmit}
                className="btn-dark w-auto px-10"
                type="submit"
              >
                Update
              </button>
            </div>
          </div>
        </form>
      )}
    </AnimationWrapper>
  );
};

export default EditProfile;
