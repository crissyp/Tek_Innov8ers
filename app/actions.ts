"use server";

import {
  getAllProjects,
  createProject,
  deleteProject,
  createTask,
  updateTask,
  deleteTask,
  updateProject,
  getAllTaskStatuses,
  searchProjects,
} from "@/lib/services";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function requireCurrentUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session.user.id;
}

export async function getProjectsAction() {
  const userId = await requireCurrentUserId();
  return await getAllProjects(userId);
}

export async function getTaskStatusesAction() {
  return await getAllTaskStatuses();
}

export async function createProjectAction(formData: FormData) {
  const userId = await requireCurrentUserId();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  if (!title || !userId) {
    throw new Error("Title is required");
  }

  const project = await createProject({
    title,
    description: description || undefined,
    userId,
  });

  revalidatePath("/");
  return project;
}

export async function updateProjectAction(
  projectId: string,
  formData: FormData,
) {
  const userId = await requireCurrentUserId();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  const project = await updateProject(projectId, userId, {
    title: title || undefined,
    description: description || undefined,
  });

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  return project;
}

export async function deleteProjectAction(projectId: string) {
  const userId = await requireCurrentUserId();
  await deleteProject(projectId, userId);
  revalidatePath("/");
}

export async function createTaskAction(formData: FormData) {
  const userId = await requireCurrentUserId();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const statusId = formData.get("status") as string;
  const projectId = formData.get("projectId") as string;

  if (!title || !projectId || !statusId) {
    throw new Error("Title, projectId, and statusId are required");
  }

  const task = await createTask(
    {
      title,
      description: description || undefined,
      statusId,
      projectId,
    },
    userId,
  );

  revalidatePath(`/projects/${projectId}`);
  return task;
}

export async function updateTaskAction(taskId: string, formData: FormData) {
  const userId = await requireCurrentUserId();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const statusId = formData.get("status") as string;

  const task = await updateTask(taskId, userId, {
    title: title || undefined,
    description: description || undefined,
    statusId: statusId || undefined,
  });

  revalidatePath(`/projects/${task.projectId}`);
  return task;
}

export async function deleteTaskAction(taskId: string) {
  const userId = await requireCurrentUserId();
  const { projectId } = await deleteTask(taskId, userId);
  revalidatePath(`/projects/${projectId}`);
}

export async function searchProjectsAction(searchQuery: string) {
  const userId = await requireCurrentUserId();
  return await searchProjects(userId, searchQuery);
}
