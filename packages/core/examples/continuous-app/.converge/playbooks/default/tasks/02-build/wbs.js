/**
 * WBS: Spawn one task per React component.
 */

const components = [
  { id: 'todo-list', name: 'TodoList', file: 'src/components/TodoList.tsx' },
  { id: 'todo-item', name: 'TodoItem', file: 'src/components/TodoItem.tsx' },
  { id: 'add-form', name: 'AddTodoForm', file: 'src/components/AddTodoForm.tsx' },
  { id: 'filter', name: 'TodoFilter', file: 'src/components/TodoFilter.tsx' },
];

export async function run(ctx) {
  let prevId = null;

  for (let i = 0; i < components.length; i++) {
    const comp = components[i];
    const id = `${String(i + 1).padStart(3, '0')}-${comp.id}`;

    await ctx.spawn({
      id,
      title: `Build ${comp.name}`,
      dependencies: prevId ? [prevId] : [],
      outputs: [comp.file],
      body: `Create the \`${comp.name}\` component at \`${comp.file}\`.

Requirements:
- TypeScript with proper types
- Functional component with hooks
- Export as default`,
    });

    prevId = id;
  }
}
