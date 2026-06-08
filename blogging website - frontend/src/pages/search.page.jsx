import { useParams } from "react-router-dom";
import InPageNavigation from "../components/inpage-navigation.component";
import Loader from "../components/loader.component";
import AnimationWrapper from "../common/page-animation";
import BlogPostCard from "../components/blog-post.component";
import NoDataMessage from "../components/nodata.component";
import LoadMoreDataBtn from "../components/load-more.component";
import { useEffect, useState } from "react";
import axios from "axios";
import { filterPaginationData } from "../common/filter-pagination-data";
import UserCard from "../components/usercard.component";

const SearchPage = () => {
  let { query } = useParams();

  let [blogs, setBlog] = useState(null);
  let [users, setUsers] = useState(null);
  let [aiSearch, setAiSearch] = useState(false);
  let [aiResults, setAiResults] = useState(null);
  let [aiLoading, setAiLoading] = useState(false);

  const fetchUsers = () => {
    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + "/search-users", { query })
      .then(({ data: { users } }) => {
        setUsers(users);
      });
  };

  const SearchBlogs = ({ page = 1, create_new_arr = false }) => {
    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", {
        query,
        page,
      })
      .then(async ({ data }) => {
        let formattedData = await filterPaginationData({
          state: blogs,
          data: data.blogs,
          page,
          countRoute: "/search-blogs-count",
          data_to_send: { query },
          create_new_arr,
        });
        setBlog(formattedData);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const fetchAiResults = () => {
    setAiLoading(true);
    setAiResults(null);
    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + "/semantic-search", {
        query,
      })
      .then(({ data }) => {
        setAiResults(data.blogs || []);
      })
      .catch((err) => {
        console.log(err);
        setAiResults([]);
      })
      .finally(() => {
        setAiLoading(false);
      });
  };

  const resetState = () => {
    setBlog(null);
    setUsers(null);
    setAiResults(null);
  };

  useEffect(() => {
    resetState();
    SearchBlogs({ page: 1, create_new_arr: true });
    fetchUsers();
  }, [query]);

  useEffect(() => {
    if (aiSearch) {
      fetchAiResults();
    }
  }, [aiSearch, query]);

  const handleToggle = (mode) => {
    setAiSearch(mode === "ai");
  };

  const UserCardWrapper = () => {
    return (
      <>
        {users == null ? (
          <Loader />
        ) : users.length ? (
          users.map((user, i) => {
            return (
              <AnimationWrapper
                key={i}
                transition={{ duration: 1, delay: i * 0.08 }}
              >
                <UserCard user={user} />
              </AnimationWrapper>
            );
          })
        ) : (
          <NoDataMessage message="No user found" />
        )}
      </>
    );
  };

  const SearchToggle = () => (
    <div className="flex items-center gap-3 mb-6 mt-2">
      <div className="flex bg-grey rounded-full p-1 gap-1">
        <button
          onClick={() => handleToggle("regular")}
          className={
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 " +
            (!aiSearch
              ? "bg-black text-white shadow"
              : "text-dark-grey hover:text-black")
          }
        >
          Regular Search
        </button>
        <button
          onClick={() => handleToggle("ai")}
          className={
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 " +
            (aiSearch
              ? "bg-black text-white shadow"
              : "text-dark-grey hover:text-black")
          }
        >
          <i className="fi fi-rr-magic-wand text-xs"></i>
          AI Search
        </button>
      </div>
      {aiSearch && (
        <p className="text-sm text-dark-grey italic">
          Showing results by meaning, not just keywords
        </p>
      )}
    </div>
  );

  const AiResultsList = () => {
    if (aiLoading) {
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-dark-grey">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm">Searching by meaning…</p>
        </div>
      );
    }
    if (!aiResults) return null;
    if (!aiResults.length) {
      return <NoDataMessage message="No semantically similar blogs found" />;
    }
    return (
      <>
        {aiResults.map((blog, i) => (
          <AnimationWrapper
            key={i}
            transition={{ duration: 1, delay: i * 0.05 }}
          >
            <BlogPostCard
              content={blog}
              author={blog.author.personal_info}
              relevanceScore={blog.relevance_pct}
            />
          </AnimationWrapper>
        ))}
      </>
    );
  };

  return (
    <section className="h-cover flex justify-center gap-10">
      <div className="w-full">
        <InPageNavigation
          routes={[`Search Results from "${query}"`, "Accounts Matched"]}
          defaultHidden={["Accounts Matched"]}
        >
          <>
            <SearchToggle />
            {aiSearch ? (
              <AiResultsList />
            ) : blogs == null ? (
              <Loader />
            ) : blogs.results.length ? (
              blogs.results.map((blog, i) => {
                return (
                  <AnimationWrapper
                    transition={{ duration: 1, delay: i * 1 }}
                    key={i}
                  >
                    <BlogPostCard
                      content={blog}
                      author={blog.author.personal_info}
                    />
                  </AnimationWrapper>
                );
              })
            ) : (
              <NoDataMessage message="No Blogs Published"></NoDataMessage>
            )}
            {!aiSearch && (
              <LoadMoreDataBtn state={blogs} fetchDataFunction={SearchBlogs} />
            )}
          </>
          <UserCardWrapper />
        </InPageNavigation>
      </div>
      <div className="min-2-[40%] lg:min-w-[350px] max-w-min border-l border-grey pl-8 pt-3 max-md:hidden">
        <h1 className="text-xl font-medium mb-8">
          Users related to search<i className="fi fi-rr-user mt-1"></i>
        </h1>
        <UserCardWrapper></UserCardWrapper>
      </div>
    </section>
  );
};
export default SearchPage;
