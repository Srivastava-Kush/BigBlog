import { Link, useNavigate } from "react-router-dom";
import logo from "../imgs/logo.png";
import defaultBanner from "../imgs/blog banner.png";
import { useContext, useEffect } from "react";
import { uploadImage } from "../common/cloudinaryUpload";
import { Toaster, toast } from "react-hot-toast";
import AnimationWrapper from "../common/page-animation";
import { EditorContext } from "../pages/editor.pages";
import EditorJS from "@editorjs/editorjs";
import { tools } from "./tools.component";
import axios from "axios";
import { UserContext } from "../App";

const BlogEditor = () => {
  const { blog, setBlog, textEditor, setTextEditor, setEditorState } =
    useContext(EditorContext);

  const { title = "", banner = "", content = {}, tags = [], des = "" } = blog;

  let {
    userAuth: { access_token },
  } = useContext(UserContext);

  let navigate = useNavigate();

  const handlePublishClick = () => {
    if (!banner.length) {
      return toast.error("Upload a blog banner to publish your blog");
    }
    if (!title.length) {
      return toast.error("Title of the blog is required to publish the blog.");
    }
    if (textEditor.isReady) {
      textEditor
        .save()
        .then((data) => {
          if (data.blocks.length) {
            setBlog({ ...blog, content: data });
            setEditorState("Publish");
          } else {
            return toast.error("Write description to publish blog.");
          }
        })
        .catch((err) => {
          console.log(err);
          return toast.error(err);
        });
    }
  };

  const handleSaveDraft = (e) => {
    if (e.target.className.includes("disable")) {
      return;
    }
    if (!title.length) {
      return toast.error("Write Blog title before saving draft");
    }

    let loadingToast = toast.loading("Saving Draft...");
    e.target.classList.add("disable");

    if (textEditor.isReady) {
      textEditor.save().then((content) => {
        let blogObj = {
          title,
          banner,
          des,
          content,
          tags,
          draft: true,
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
            toast.success("Saved");

            setTimeout(() => {
              navigate("/");
            }, 500);
          })
          .catch(({ response }) => {
            e.target.classList.remove("disable");
            toast.dismiss(loadingToast);
            return toast.error(response.data.error);
          });
      });
    }
  };
  //Editor is created two times because react renders two times.
  //can be solved by either removing strict mode (we are following this)
  //or we can write a cleanup function in useEffect .
  //  return () => {
  //     // Cleanup: destroy the editor instance when component unmounts
  //     if (editor && editor.destroy) {
  //       editor.destroy();
  //     }
  //   };
  useEffect(() => {
    if (!textEditor.isReady) {
      setTextEditor(
        new EditorJS({
          holderId: "textEditor",
          data: content,
          tools: tools,
          placeholder: "Let's write an awesome story.",
        }),
      );
    }
  }, []);

  const handleBannerUpload = async (e) => {
    let image = e.target.files[0];
    console.log(image);
    if (image) {
      let loadingToast = toast.loading("Uploading..");
      try {
        const secureUrl = await uploadImage(image);
        toast.dismiss(loadingToast);
        toast.success("Uploaded : 3");
        // bannerRef.current.src = secureUrl;
        //We removed ref and handled it through OnError event
        setBlog({ ...blog, banner: secureUrl });
      } catch (err) {
        console.error("Image upload FAiled", err);
        toast.dismiss(loadingToast);
        toast.error("Upload Failed");
      }
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.keyCode == 13) {
      //Enter Key is pressed
      e.preventDefault(); //AND we are preventing text-area from expanding on enter key.
    }
  };
  const handleTitleChange = (e) => {
    //We can access textarea using ref or e.target
    let input = e.target;
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";

    setBlog({ ...blog, title: input.value });
  };

  const handleBannerError = (e) => {
    let bannerImg = e.target;
    bannerImg.src = defaultBanner;
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="flex-none w-10">
          <img src={logo} className="w-full"></img>
        </Link>
        <p className="max-md:hidden text-black line-clamp w-full">
          {title.length ? title : "New Blog"}
        </p>
        <div className="flex gap-4 ml-auto">
          <button className="btn-dark py-2" onClick={handlePublishClick}>
            Publish
          </button>
          <button className="btn-light py-2" onClick={handleSaveDraft}>
            Save Draft
          </button>
        </div>
      </nav>
      <Toaster />
      <AnimationWrapper>
        <section>
          <div className="mx-auto max-w-[900px] w-full">
            <div className="relative aspect-video hover:opacity-80 bg-white border-4 border-grey">
              <label htmlFor="uploadBanner">
                <img
                  onError={handleBannerError}
                  src={banner}
                  className="z-20"
                />
                <input
                  id="uploadBanner"
                  type="file"
                  accept=".png,.jpeg,.jpg"
                  hidden
                  onChange={handleBannerUpload}
                />
              </label>
            </div>
            <textarea
              defaultValue={title}
              placeholder="Blog Title"
              className="text-4xl font-medium w-full h-20 outline-none  resize-none mt-10 leading-tight placeholder:opacity-40"
              onKeyDown={handleTitleKeyDown}
              onChange={handleTitleChange}
            ></textarea>
            <hr className="w-full opacity-10 my-5" />
            <div id="textEditor" className="font-gelasio">
              {/* We will use an external lib to create editor. */}
            </div>
          </div>
        </section>
      </AnimationWrapper>
    </>
  );
};
export default BlogEditor;
