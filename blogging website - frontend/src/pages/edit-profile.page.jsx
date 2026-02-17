import { useContext, useEffect } from "react";
import { UserContext } from "../App";
import axios from "axios";

const EditProfile = () => {
  let {
    userAuth,
    userAuth: { access_token },
  } = useContext(UserContext);

  useEffect(() => {
    if (access_token) {
      axios
        .post(import.meta.env.VITE_SERVER_DOMAIN + "/get-profile", {
          username: userAuth.username,
        })
        .then(({ data }) => {
          console.log(data);
        });
    }
  }, [access_token]);

  return <h1>This is edit profile page.</h1>;
};

export default EditProfile;
