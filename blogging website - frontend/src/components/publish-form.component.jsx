import { Toaster, toast } from "react-hot-toast";
import AnimationWrapper from "../common/page-animation";
import { useContext } from "react";
import { EditorContext } from "../pages/editor.pages";
import Tag from "./tags.component.jsx";
import { UserContext } from "../App.jsx";
import { useNavigate } from "react-router-dom";

import axios from "axios";

const PublishForm = () => {
  let characterLimit = 200;
  let tagLimit = 10;
  let {
    blog,
    blog: { title, tags, des, banner, content },
    setEditorState,
    setBlog,
  } = useContext(EditorContext);

  let {
    userAuth: { access_token },
  } = useContext(UserContext);

  let navigate = useNavigate();

  const handleDesKeyDown = (e) => {
    if (e.keyCode == 13) {
      //Enter Key is pressed
      e.preventDefault(); //AND we are preventing text-area from expanding on enter key.
    }
  };

  const publishBlog = (e) => {
    //if the button is disabled the req won't go again
    if (e.target.className.includes("disable")) {
      return;
    }
    if (!title.length) {
      return toast.error("Write Blog title before publishing");
    }
    if (!des.length || des.length > characterLimit) {
      return toast.error(
        `Enter the desciption within the ${characterLimit} word limit`,
      );
    }
    if (!tags.length) {
      return toast.error("Enter atleast one tag to publish your blog.");
    }

    let loadingToast = toast.loading("Publishing");
    e.target.classList.add("disable");

    let blogObj = {
      title,
      banner,
      des,
      content,
      tags,
      draft: false,
    };

    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + "/create-blog", blogObj, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
      .then(() => {
        e.target.classList.remove("disable");
        toast.dismiss(loadingToast);
        toast.success("Published");

        setTimeout(() => {
          navigate("/");
        }, 200);
      })
      .catch(({ response }) => {
        e.target.classList.remove("disable");
        toast.dismiss(loadingToast);
        return toast.error(response.data.error);
      });

    //Its a property of axios to return whole axios data so we need to destructure the response from that data and then error is provided at : response.data.error
  };

  const handleCloseEvent = () => {
    setEditorState("editor");
  };

  const handleTitleChange = (e) => {
    let input = e.target;
    setBlog({ ...blog, title: input.value });
  };

  const handleDesChange = (e) => {
    let input = e.target;
    setBlog({ ...blog, des: input.value });
  };

  const handleTagsKeyDown = (e) => {
    if (e.keyCode == 13 || e.keyCode == 188) {
      e.preventDefault();
      let tag = e.target.value;
      if (tags.length < tagLimit) {
        if (!tags.includes(tag) && tag.length) {
          setBlog({ ...blog, tags: [...tags, tag] });
        }
      } else {
        toast.error(`You can add only ${tagLimit} tags`);
      }

      e.target.value = "";
    }
  };
  return (
    <>
      <AnimationWrapper>
        <section className="w-screen min-h-screen grid items-center lg:grid-cols-2 py-16 lg:gap-4">
          <Toaster />
          <button
            onClick={handleCloseEvent}
            className="w-12 h-12 absolute z-10 right-[5vw] top-[5%] lg:top-[10%]"
          >
            <i className="fi fi-rr-cross-circle "></i>
          </button>

          <div className="max-w-[550px] center">
            <p className="text-dark-grey mb-1">Preview</p>
            <div className="w-full rounded-lg aspect-video overflow-hidden mt-4 bg-grey">
              <img src={banner}></img>
            </div>
            <h1 className="font-medium mt-2 leading-tight line-clamp-2 text-4xl">
              {title}
            </h1>
            <p className="font-gelasio line-clamp-2 text-xl leading-7 mt-4">
              {des}
            </p>
          </div>
          <div className="">
            <p className="text-dark-grey mb-2 mt-g">Blog Title</p>
            <input
              type="text"
              placeholder="Blog Title"
              defaultValue={title}
              className="input-box pl-4"
              onChange={handleTitleChange}
            />
            <p className="text-dark-grey mb-2 mt-g">Short Description</p>
            <textarea
              maxLength={characterLimit}
              defaultValue={des}
              className="h-40 resize-none leading-7 input-box pl-4"
              onChange={handleDesChange}
              onKeyDown={handleDesKeyDown}
            ></textarea>
            <p className="mt-1 text-dark-grey text-sm text-right">
              {characterLimit - des.length} characters left
            </p>
            <p className="text-dark-grey mt-5 mb-5">
              {" "}
              Topics - (Helps in searching and ranking blog posts)
            </p>
            <div className="relative input-box pl-2 py-2 pb-4">
              <input
                type="text"
                placeholder="Topics..."
                className="sticky input-box bg-white top-0 left-0 pl-4 mb-3 focus:bg-white"
                onKeyDown={handleTagsKeyDown}
              ></input>
              {tags.map((tag, i) => {
                return <Tag tag={tag} tagIndex={i} key={i} />;
              })}
            </div>
            <p className="mt-2 mb-4 text-dark-grey text-right text-sm">
              {tagLimit - tags.length} tags left
            </p>
            <button className="btn-dark px-8 " onClick={publishBlog}>
              Publish
            </button>
          </div>
        </section>
      </AnimationWrapper>
    </>
  );
};
export default PublishForm;
