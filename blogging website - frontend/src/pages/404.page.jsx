import { Link } from "react-router-dom";
import pageNotFoundImage from "../imgs/404.png";
import fullLogo from "../imgs/full-logo.png";
const PageNotFound = () => {
  return (
    <>
      <section className="h-cover relative p-10 flex flex-col items-center gap-20 text-center">
        <img
          src={pageNotFoundImage}
          className="select-none border-2 w-72 aspect-square object-cover rounded border-grey"
        />
        <h1 className="font-gelasio text-4xl leading-7">Page not found</h1>
        <p className="text-xl text-dark-grey -mt-8 leading-7">
          The page you are looking for does not exists.Head back to{" "}
          <Link to="/" className="text-black">
            {" "}
            Home page
          </Link>
        </p>
        <div>
          <img
            src={fullLogo}
            className="select-none h-8 object-contain block mx-auto"
          ></img>
        </div>
      </section>
    </>
  );
};
export default PageNotFound;
