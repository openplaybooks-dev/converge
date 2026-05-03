// No-op seed skeleton — not invoked during this slice's checks.
// Would spawn one trivial child if run.
module.exports = async function seed() {
  return [{ name: "child-task" }];
};
