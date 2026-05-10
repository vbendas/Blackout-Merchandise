/**
 * Cross-project re-export from /app
 *
 * The mainpage and app share chat components to avoid code duplication.
 * This relative path crosses the monorepo project boundary.
 *
 * WARNING: If either project moves or the component changes location,
 * this import will break. Consider migrating to a shared package
 * or tsconfig path alias in the future.
 *
 * Related: Issue #16
 */
export { CatChat } from '../../../../app/src/components/chat/CatChat';
