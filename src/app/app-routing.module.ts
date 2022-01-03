import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { GridModule } from "@progress/kendo-angular-grid";

const routes: Routes = [
  { path: "dashboard", component: DashboardComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes), GridModule  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
