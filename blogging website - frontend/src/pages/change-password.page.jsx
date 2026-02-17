import { useContext, useRef } from "react";
import AnimationWrapper from "../common/page-animation";
import InputBox from "../components/input.component";
import { toast, Toaster } from "react-hot-toast";
import axios from "axios";
import { UserContext } from "../App";

const ChangePassword = () => {
  let {
    userAuth: { access_token },
  } = useContext(UserContext);
  let changePasswordFormRef = useRef();
  let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

  const handleSubmit = (e) => {
    e.preventDefault();
    let form = new FormData(changePasswordFormRef.current);
    let formData = {};

    for (let [key, value] of form.entries()) {
      formData[key] = value;
    }

    let { currentPassword, newPassword } = formData;

    if (!currentPassword.length || !newPassword.length) {
      return toast.error("Please enter values in all fields.");
    }

    if (
      !passwordRegex.test(currentPassword) ||
      !passwordRegex.test(newPassword)
    ) {
      toast.error(
        "Password must be 6-20 characters and 1 uppercase,1 numeric,1 lowercase",
      );
    }
    e.target.setAttribute("disabled", true);

    let loadingToast = toast.loading("Updating....");

    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + "/change-password", formData, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
      .then(() => {
        toast.dismiss(loadingToast);
        e.target.removeAttribute("disabled");
        return toast.success("Password change successfully");
      })
      .catch(({ response }) => {
        toast.dismiss(loadingToast);
        e.target.removeAttribute("disabled");
        return toast.error(response.data.error);
      });
  };

  return (
    <AnimationWrapper>
      <Toaster />
      <form ref={changePasswordFormRef}>
        <h1 className="max-md:hidden">Change Password</h1>
        <div className="md:max-w-[400px] py-10 w-full">
          <InputBox
            name="currentPassword"
            type="password"
            className="profile-edit-input"
            placeholder="Enter your current password"
            icon="fi-rr-unlock"
          />
          <InputBox
            name="newPassword"
            type="password"
            className="profile-edit-input"
            placeholder="Enter your new password"
            icon="fi-rr-unlock"
          />
          <button
            onClick={handleSubmit}
            className="btn-dark px-10"
            type="submit"
          >
            Change Password
          </button>
        </div>
      </form>
    </AnimationWrapper>
  );
};
export default ChangePassword;
