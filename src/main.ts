import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { AppRoutingModule } from './app/app-routing.module';
import { HttpClientModule } from '@angular/common/http';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    // Importa los providers necesarios que antes estaban en AppModule
    importProvidersFrom(BrowserModule, AppRoutingModule, HttpClientModule)
  ]
})
  .catch((err: unknown) => console.error(err));
