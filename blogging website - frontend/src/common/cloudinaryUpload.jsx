export const uploadImage = async (imageFile) => {
  const urlToCall = `${import.meta.env.VITE_SERVER_DOMAIN}/get-upload-url`;
  const res = await fetch(urlToCall);

  if (!res.ok) {
    const text = await res.text();
    console.error("Get upload URL failed:", res.status, text);
    throw new Error(`Failed to get upload URL: ${res.status}`);
  }

  const { uploadUrl, timestamp, signature, publicId, apiKey } =
    await res.json();

  //2.Prepare upload Payload :D
  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("public_id", publicId);
  formData.append("signature", signature);

  console.log(formData);

  //3. Uploading to cloudinary
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });
  //4. Send url to frontEnd to use in src of the image.
  const data = await uploadRes.json();
  if (!data.secure_url) {
    throw new Error("Upload failed: No secure URL returned");
  }
  console.log(data.secure_url);
  return data.secure_url;
};
