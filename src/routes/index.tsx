import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.api.hello.helloWorld().then(setMessage);
  }, []);

  return (
    <div className="p-2">
      <h3 className="text-red-500">Welcome Home!</h3>
      <p>{message}</p>
    </div>
  );
}
