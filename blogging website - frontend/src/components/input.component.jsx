import { useState } from "react";

const InputBox = ({ name, placeholder, type, value, id, icon }) => {
  const [passVisible, setPassVisible] = useState(false);

  return (
    <div className="relative w-[100%] mb-4">
      <input
        name={name}
        type={type == "password" ? (passVisible ? "text" : "password") : type}
        placeholder={placeholder}
        defaultValue={value}
        id={id}
        className="input-box"
      />
      <i className={"fi " + icon + " input-icon"}></i>
      {type == "password" ? (
        <i
          onClick={() => setPassVisible((currentVal) => !currentVal)}
          className={
            "fi fi-rr-eye" +
            (!passVisible ? "-crossed" : "") +
            " input-icon left-[auto] right-4 cursor-pointer"
          }
        />
      ) : (
        ""
      )}
    </div>
  );
};

export default InputBox;
