//importing tools
import Embed from "@editorjs/embed";
import List from "@editorjs/list";
import Image from "@editorjs/image";
import Header from "@editorjs/header";
import Quote from "@editorjs/quote";
import Marker from "@editorjs/marker";
import InlineCode from "@editorjs/inline-code";
import Link from "@editorjs/link";

import { uploadImage } from "../common/cloudinaryUpload.jsx";

const uploadImageByFile = (e) => {
  //we already get the image need not to do e.target.files[0]
  //we need to return uploadImage Promise .
  return uploadImage(e)
    .then((url) => {
      if (url) {
        return { success: 1, file: { url } };
      }
    })
    .catch((err) => {
      console.log(err);
    });
};

const uploadImageByURL = (e) => {
  let link = new Promise((resolve, reject) => {
    try {
      resolve(e);
    } catch (err) {
      reject(err);
    }
  });

  return link.then((url) => {
    return {
      success: 1,
      file: { url },
    };
  });
};

//We don't automatically inline-toolbox so we need some more configs

//We also might need different levels of heading so we are giving two level of headings.
export const tools = {
  embed: Embed,
  link: Link,
  header: {
    class: Header,
    config: {
      placeholder: "Type Heading...",
      levels: [2, 3],
      defaultLevel: 2,
    },
  },
  quote: {
    class: Quote,
    inlineToolbar: true,
  },
  inlineCode: InlineCode,
  marker: Marker,
  image: {
    class: Image,
    config: {
      uploader: {
        uploadByUrl: uploadImageByURL,
        uploadByFile: uploadImageByFile,
      },
    },
  },
  list: { class: List, inlineToolbar: true },
};
