import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
console.log("currentFile:", currentFile);
console.log("currentDir:", currentDir);
console.log("two levels up:", resolve(currentDir, "../.."));
console.log("skills dir:", join(resolve(currentDir, "../.."), "skills"));
