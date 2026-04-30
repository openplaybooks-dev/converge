// No-op wbs skeleton — not invoked during this slice's checks.
// Would spawn one trivial child if run.
module.exports = async function wbs() {
  return [{ name: "child-task" }];
};
