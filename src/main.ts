import './styles/leaflet.css';
import './ui/workbench.css';
import './styles/studio.css';
import { bootstrapOutdoorRouteStudio } from './app/bootstrap.ts';

bootstrapOutdoorRouteStudio().catch(error => {
  console.error('Outdoor Route Studio failed to start', error);
  document.documentElement.dataset.bootError = 'true';
});
