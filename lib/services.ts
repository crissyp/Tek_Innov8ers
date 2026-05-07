import { prismaClient } from "./db";
import { TaskStatus } from "@prisma/client";
import { removeUndefinedProperties } from "./utils";

export async function searchProjects(
  userId: string,
  searchQuery: string,
): Promise<Project[]> {
  const normalizedQuery = searchQuery.trim();

  if (!normalizedQuery) {
    return [];
  }

  const results = await prismaClient.project.findMany({
    where: {
      userId,
      title: {
        contains: normalizedQuery,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return results;
}

export type Project = {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  statusId: string;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
};

export type ProjectWithTasks = Project & {
  tasks: Task[];
};

export type ProjectWithTaskCount = Project & {
  _count: {
    tasks: number;
  };
};

export type TaskWithStatus = Task & {
  status: TaskStatus;
};

// Task Status operations
export async function getAllTaskStatuses(): Promise<TaskStatus[]> {
  return await prismaClient.taskStatus.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

// Project operations
export async function getAllProjects(
  userId: string,
): Promise<ProjectWithTaskCount[]> {
  const projects = await prismaClient.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      _count: {
        select: { tasks: true },
      },
    },
  });

  return projects;
}

export async function getProjectById(projectId: string, userId: string) {
  const project = await prismaClient.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
      tasks: {
        include: {
          status: true,
        },
        orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
      },
    },
  });

  return project;
}

export async function createProject(data: {
  title: string;
  description?: string;
  userId: string;
}): Promise<Project> {
  const newProject = await prismaClient.project.create({
    data,
  });
  return newProject;
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: { title?: string; description?: string },
): Promise<Project> {
  const now = new Date().toISOString();

  const projectDataToUpdate = removeUndefinedProperties(data);

  const project = await prismaClient.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const updatedProject = await prismaClient.project.update({
    where: { id: project.id },
    data: {
      ...projectDataToUpdate,
      updatedAt: new Date(now),
    },
  });
  return updatedProject;
}

export async function deleteProject(
  projectId: string,
  userId: string,
): Promise<void> {
  const deleted = await prismaClient.project.deleteMany({
    where: {
      id: projectId,
      userId,
    },
  });

  if (deleted.count === 0) {
    throw new Error("Project not found");
  }
}

export async function createTask(
  data: {
    title: string;
    description?: string;
    statusId: string;
    projectId: string;
  },
  userId: string,
): Promise<TaskWithStatus> {
  const project = await prismaClient.project.findFirst({
    where: {
      id: data.projectId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const newTask = await prismaClient.task.create({
    data: {
      ...data,
      projectId: project.id,
    },
    include: { status: true },
  });
  return newTask;
}

export async function updateTask(
  taskId: string,
  userId: string,
  data: { title?: string; description?: string; statusId?: string },
): Promise<TaskWithStatus> {
  const now = new Date().toISOString();
  // remove undefined values
  const taskDataToUpdate = removeUndefinedProperties(data);

  const task = await prismaClient.task.findFirst({
    where: {
      id: taskId,
      project: {
        userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  const updatedTask = await prismaClient.task.update({
    where: { id: task.id },
    data: {
      ...taskDataToUpdate,
      updatedAt: new Date(now),
    },
    include: { status: true },
  });

  return updatedTask;
}

export async function deleteTask(
  taskId: string,
  userId: string,
): Promise<{ projectId: string }> {
  const task = await prismaClient.task.findFirst({
    where: {
      id: taskId,
      project: {
        userId,
      },
    },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  await prismaClient.task.delete({
    where: { id: task.id },
  });

  return { projectId: task.projectId };
}
