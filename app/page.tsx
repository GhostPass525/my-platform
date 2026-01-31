const handleSubmit = async () => {
  setLoading(true);
  setResult("");

  const count = Number(localStorage.getItem("ip_count") || 0);

  try {
    const res = await fetch("/api/idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, count }),
    });

    const data = await res.json();
    setResult(data.result);

    if (!data.locked) {
      localStorage.setItem("ip_count", String(count + 1));
    }
  } catch {
    setResult("Something went wrong.");
  }

  setLoading(false);
};
