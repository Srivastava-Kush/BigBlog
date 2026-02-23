import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import { filterPaginationData } from "../common/filter-pagination-data";
import { Toaster } from "react-hot-toast";
import InPageNavigation from "../components/inpage-navigation.component";
import Loader from "../components/loader.component";
import NoDataMessage from "../components/nodata.component";
import AnimationWrapper from "../common/page-animation";
import {
  ManageDraftBlogPost,
  ManagePublishedBlogCard,
} from "../components/manage-blogcard.component";

const ManageBlogs = () => {
  let {
    userAuth: { access_token },
  } = useContext(UserContext);
  const [blogs, setBlogs] = useState(null);
  const [drafts, setDrafts] = useState(null);
  const [query, setQuery] = useState("");
  const getBlogs = ({ page, query, draft, deletedDocCount = 0 }) => {
    axios
      .post(
        import.meta.env.VITE_SERVER_DOMAIN + "/user-written-blogs",
        {
          page,
          draft,
          query,
          deletedDocCount,
        },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      )
      .then(async ({ data }) => {
        let formattedData = await filterPaginationData({
          state: draft ? drafts : blogs,
          data: data.blogs,
          page,
          user: access_token,
          countRoute: "/user-written-blogs-count",
          data_to_send: { draft, query },
        });
        console.log(formattedData);
        if (draft) {
          setDrafts(formattedData);
        } else {
          setBlogs(formattedData);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleSearchChange = (e) => {
    if (!e.target.value.length) {
      setQuery("");
      setBlogs(null);
      setQuery(null);
    }
  };

  const handleSearch = (e) => {
    let searchQuery = e.target.value;

    setQuery(searchQuery);

    if (e.keyCode == 13 && searchQuery.length) {
      setBlogs(null);
      setDrafts(null);
    }
  };

  useEffect(() => {
    if (access_token) {
      if (blogs == null) {
        getBlogs({ page: 1, draft: false });
      }
      if (drafts == null) {
        getBlogs({ page: 1, draft: true });
      }
    }
  }, [access_token, blogs, drafts, query]);
  return (
    <>
      <h1 className="max-md:hidden">Manage Blogs</h1>
      <Toaster />
      <div className="relative max-md:mt-5 md:mt-8 mb-10">
        <input
          type="seatch"
          className="w-full bg-grey p-4 pl-12 pr-6 rounded-full placeholder:text-dark-grey"
          placeholder="Search blogs.."
          onChange={handleSearchChange}
          onKeyDown={handleSearch}
        />
      </div>
      <InPageNavigation routes={["Published Blogs", "Drafts"]}>
        {blogs == null ? (
          <Loader />
        ) : blogs.results.length ? (
          <>
            {blogs.results.map((blog, i) => (
              <AnimationWrapper key={i} transition={{ delay: i * 0.04 }}>
                <ManagePublishedBlogCard
                  blog={{ ...blog, index: i, setStateFunction: setDrafts }}
                />
              </AnimationWrapper>
            ))}
          </>
        ) : (
          <NoDataMessage message="No published blogs" />
        )}
        {drafts == null ? (
          <Loader />
        ) : drafts.results.length ? (
          <>
            {drafts.results.map((blog, i) => (
              <AnimationWrapper key={i} transition={{ delay: i * 0.04 }}>
                <ManageDraftBlogPost
                  blog={{ ...blog, index: i + 1, setStateFunction: setDrafts }}
                />
              </AnimationWrapper>
            ))}
          </>
        ) : (
          <NoDataMessage message="No published blogs" />
        )}
      </InPageNavigation>
    </>
  );
};
export default ManageBlogs;
