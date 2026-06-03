/**
 * Skill Auto-Installer
 *
 * Auto-install a skill from the converge package into the project's .converge/skills/.
 */

/**
 * Auto-install a skill from the converge package into the project's .converge/skills/.
 * Returns true if the skill was found and installed.
 */
export async function autoInstallPackageSkill(
  skillName: string,
  projectDir: string,
): Promise<boolean> {
  const { existsSync } = await import("node:fs");
  const { join, dirname, resolve } = await import("node:path");
  const {
    mkdir,
    readdir,
    copyFile: fsCopyFile,
  } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");

  // Resolve the converge package's skills directory
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);
  const packageRoot = currentDir.includes("/dist")
    ? resolve(currentDir, "..")
    : resolve(currentDir, "../../..");
  const packageSkillsDir = join(packageRoot, "skills");

  const srcDir = join(packageSkillsDir, skillName);
  if (!existsSync(srcDir) || !existsSync(join(srcDir, "SKILL.md"))) {
    return false;
  }

  const destDir = join(projectDir, ".converge", "skills", skillName);

  // Recursive copy
  async function copyDir(src: string, dest: string): Promise<void> {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await fsCopyFile(srcPath, destPath);
      }
    }
  }

  await copyDir(srcDir, destDir);
  console.log(`   ✅ Auto-installed skill: ${skillName}`);
  return true;
}
