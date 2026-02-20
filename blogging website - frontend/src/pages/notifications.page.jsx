import { useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import { filterPaginationData } from "../common/filter-pagination-data";
import axios from "axios";
import Loader from "../components/loader.component";

const Notifications = () => {
  const [filter, setFilter] = useState("all");
  let filters = ["all", "like", "comment", "reply"];
  const [notifications, setNotifications] = useState(null);

  let {
    userAuth: { access_token },
  } = useContext(UserContext);

  const fetchNotifications = ({ page, deletedDocCount = 0 }) => {
    axios
      .post(
        import.meta.env.VITE_SERVER_DOMAIN + "/notifications",
        {
          page,
          filter,
          deletedDocCount,
        },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      )
      .then(async ({ data: { notifications: data } }) => {
        let formattedData = await filterPaginationData({
          data_to_send: { filter },
          page,
          data,
          state: notifications,
          countRoute: "/all-notifications-count",
          user: access_token,
        });

        setNotifications(formattedData);
        console.log(formattedData);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleFilterFunc = (e) => {
    let btn = e.target;

    setFilter(btn.innerHTML);
    setNotifications(null);
  };

  useEffect(() => {
    if (access_token) {
      fetchNotifications({ page: 1 });
    }
  }, [access_token, filter]);

  return (
    <div>
      <h1 className="max-md:hidden"> Recent notifications</h1>
      <div className="my-8 flex gap-6">
        {filters.map((filterName, i) => {
          return (
            <button
              className={
                "py-2 " + (filter == filterName ? "btn-dark " : "btn-light ")
              }
              key={i}
              onClick={handleFilterFunc}
            >
              {filterName}
            </button>
          );
        })}
      </div>

      {notifications == null ? <Loader /> : <>{notifications.results}</>}
    </div>
  );
};
export default Notifications;
