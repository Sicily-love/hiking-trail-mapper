import './styles/leaflet.css';
import './styles/components.css';
import './styles/studio.css';
import './styles/workbench-v3.css';
import { bootstrapOutdoorRouteStudio } from './app/bootstrap.ts';

bootstrapOutdoorRouteStudio().catch(error => {
  console.error('Outdoor Route Studio failed to start', error);
  document.documentElement.dataset.bootError = 'true';
});
