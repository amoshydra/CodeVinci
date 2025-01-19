window.onmessage = (event) => {
  console.log(event);
  if (event.data.type === "data") {
    const script = document.createElement("script");
    script.innerHTML = atob(event.data.data);
    script.type = "module";
    document.head.appendChild(script);
  }
};
