import { join } from "node:path";
import { homedir } from "node:os";

export const NAME = "dmget";
export const DESCRIPTION =
  "A CLI helper to download Devmountain exercises, homework, and lecture demos.";
export const BASE_URL = "https://ed.devmountain.com/materials";
export const EXERCISE_URL = `${BASE_URL}/exercises`;
export const HOMEWORK_URL = `${BASE_URL}/homework`;
export const DEMO_URL = `${BASE_URL}/lectures`;
export const DESTINATION = join(homedir(), "src");
