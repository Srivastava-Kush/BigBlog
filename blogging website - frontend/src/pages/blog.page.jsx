import { createContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import axios from "axios";
import { getDay } from "../common/date";
import BlogInteraction from "../components/blog-interaction.component";
import BlogPostCard from "../components/blog-post.component";
import BlogContent from "../components/blog-content.component";
export const BlogStructure = {
  title: "",
  des: "",
  content: [],
  tags: [],
  publishedAt: "",
  banner: "",
  author: { personal_info: {} },
};

export const BlogContext = createContext({});
const BlogPage = () => {
  let { blog_id } = useParams();
  let [blog, setBlog] = useState(BlogStructure);
  let [loadingState, setLoadingState] = useState(true);
  const [similarBlogs, setSimilarBlogs] = useState(null);
  let {
    title,
    content,
    banner,
    des,
    author: {
      personal_info: { fullname, profile_img, username: author_username },
    },
    publishedAt,
  } = blog;

  const fetchBlog = () => {
    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + "/get-blog", {
        blog_id,
      })
      .then(({ data: { blog } }) => {
        console.log(blog.tags);
        setBlog(blog);
        axios
          .post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", {
            tag: blog.tags[0],
            limit: 6,
            eliminate_blog: blog_id,
          })
          .then(({ data }) => {
            console.log(data.blogs);
            setSimilarBlogs(data.blogs);
          })
          .catch((err) => {
            console.log(err);
          });

        setLoadingState(false);
      })
      .catch((err) => {
        setLoadingState(false);
      });
  };

  const resetStates = () => {
    setBlog(BlogStructure);
    setSimilarBlogs(null);
    setLoadingState(true);
  };
  useEffect(() => {
    resetStates();
    fetchBlog();
  }, [blog_id]);
  return (
    <AnimationWrapper>
      {loadingState ? (
        <Loader />
      ) : (
        <BlogContext.Provider value={{ blog, setBlog }}>
          <div className="max-w-[900px] center py-10 max-lg:px-[5vw]">
            <img src={banner} className="aspect-video" />
            <div className="mt-12">
              <h2>{title}</h2>
              <div className="flex max-sm:flex-col justify-between my-8">
                <div className="flex gap-5 items-start">
                  <img
                    src={profile_img}
                    className="w-12 h-12 rounded-full"
                  ></img>
                  <p>
                    {fullname}
                    <br />@
                    <Link to={`/user/${author_username}`} className="underline">
                      {author_username}
                    </Link>
                  </p>
                </div>
                <p className="text-dark-grey opacity-75 max-sm:mt-6 max-sm:ml-12 max-sm:pl-5">
                  Published On {getDay(publishedAt)}
                </p>
              </div>
            </div>
            <BlogInteraction />
            <div className="my-12 font-gelasio blog-page-content">
              {content[0].blocks.map((block, i) => {
                console.log(block);
                return (
                  <div key={i}>
                    <BlogContent block={block} />
                  </div>
                );
              })}
            </div>

            <BlogInteraction />
            {similarBlogs != null && similarBlogs.length ? (
              <>
                <h1 className="text-2xl mt-14 mb-10 font-medium">
                  Similar Blogs
                </h1>
                {similarBlogs.map((blog, i) => {
                  let {
                    author: { personal_info },
                  } = blog;

                  return (
                    <AnimationWrapper
                      transition={{ duration: 1, delay: i * 0.08 }}
                      key={i}
                    >
                      <BlogPostCard
                        content={blog}
                        author={personal_info}
                      ></BlogPostCard>
                    </AnimationWrapper>
                  );
                })}
              </>
            ) : (
              ""
            )}
          </div>
        </BlogContext.Provider>
      )}
    </AnimationWrapper>
  );
};
export default BlogPage;
