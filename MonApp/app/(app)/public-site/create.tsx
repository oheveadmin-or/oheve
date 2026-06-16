// Redirige vers le système unique de site de mariage
import { Redirect } from 'expo-router';

export default function CreatePublicSiteRedirect() {
  return <Redirect href="/(app)/wedding-site-builder" />;
}
