function createTestRuntimeContext(app, project, state, overrides = {}) {
  const projectStore = app.createProjectStore(project);
  return app.createRuntimeContext({
    projectActions:app.createProjectActions(projectStore),
    projectSelectors:app.createProjectSelectors(() => projectStore.snapshot()),
    stateActions:app.createAppStateActions(state),
    stateSelectors:app.createAppStateSelectors(() => state.snapshot()),
    commands:new app.CommandRegistry(),
    interactions:app.createStudioInteractionManager(),
    renderer:new app.RenderScheduler({raf:callback => { callback(0); return 1; }, caf:() => {}}),
    dialogs:{confirm:async () => true},
    ...overrides,
  });
}

module.exports = {createTestRuntimeContext};
