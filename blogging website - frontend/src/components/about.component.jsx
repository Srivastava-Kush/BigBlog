import { Link } from "react-router-dom";
import { getFullDay } from "../common/date";

const AboutUser = ({ bio, social_links, joinedAt, className }) => {
  return (
    <div className={"md:w-[90%] md:mt-7 " + className}>
      <p className="text-xl leading-3">
        {bio.length ? bio : "Nothing to read here"}
      </p>
      <div className="flex gap-x-7 gap-y-2 flex wrap my-7 items-center text-dark-grey">
        {Object.keys(social_links).map((key) => {
          let link = social_links[key];
          return link ? (
            <Link to={link} key={key} target="_blank">
              <i
                className={
                  "fi " +
                  (key != "website" ? "fi-brands-" + key : "fi-rr-globe") +
                  " text-2xl hover:text-black"
                }
              ></i>
            </Link>
          ) : (
            " "
          );
        })}
        {/* provides an array of keys of the object passed      */}
      </div>
      <p className="text-xl leading-6 text-dark-grey">
        Joined On {getFullDay(joinedAt)}
      </p>
    </div>
  );
};
export default AboutUser;
