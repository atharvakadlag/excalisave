import React from "react";
import ReactDOM from "react-dom";

type MountOptions = {
  useShadow?: boolean;
  appendChild?: boolean;
  className?: string;
};

export function mountReactComponent(
  Component: React.ReactElement,
  target: HTMLElement,
  options: MountOptions = {}
) {
  const { useShadow = true, appendChild = false, className = "" } = options;

  let mountPoint: HTMLElement;

  if (useShadow) {
    const shadow = target.attachShadow({ mode: "open" });
    mountPoint = document.createElement("div");
    mountPoint.className = className;
    shadow.appendChild(mountPoint);
  } else if (appendChild) {
    mountPoint = document.createElement("div");
    mountPoint.className = className;
    target.appendChild(mountPoint);
  } else {
    mountPoint = target;
  }

  ReactDOM.render(Component, mountPoint);

  return {
    unmount: () => ReactDOM.unmountComponentAtNode(mountPoint),
    mountPoint,
  };
}
