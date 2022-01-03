import { Component, OnInit, ViewChild, Renderer2 } from '@angular/core';
import {Apollo, gql} from 'apollo-angular';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { WebsocketService } from '../websocket.service';
import { AddEvent, GridComponent, CellClickEvent } from '@progress/kendo-angular-grid';

const formGroup = (dataItem: {
  id?: any;
  age?: any;
  firstName?: any;
  lastName?: any;
  dateOfBirth?: any;
  gender?: any;
  address?: any;
  contact?: any;
}) => new FormGroup({
  id: new FormControl(dataItem.id),
  age: new FormControl(dataItem.age, Validators.required),
  firstName: new FormControl(dataItem.firstName, Validators.required),
  lastName: new FormControl(dataItem.lastName, Validators.required),
  dateOfBirth: new FormControl(dataItem.dateOfBirth, Validators.required),
  gender: new FormControl(dataItem.gender, Validators.required),
  address: new FormControl(dataItem.address, Validators.required),
  contact: new FormControl(dataItem.contact, Validators.required),
});

const hasClass = (el: { className: string; }, className: string | RegExp) => new RegExp(className).test(el.className);

const isChildOf = (el: { parentElement: any; }, className: string) => {
  while (el && el.parentElement) {
      if (hasClass(el.parentElement, className)) {
          return true;
      }
      el = el.parentElement;
  }
  return false;
};

// Dashboard component(student info table)
@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  studentData: any[] = []; // to store data from backend service & populate on table
  private counter: number = 0;
  private loading = true;
  private error: any;
  fileName: string = '';

  public formGroup: FormGroup | any;
  public view: any[] | any;
  @ViewChild(GridComponent)
  private grid: GridComponent | any;
  private editedRowIndex: number | any;
  private isNew = false;

  // initialize graphql service, web socket service
  constructor(
    private apollo: Apollo,
    private http: HttpClient,
    private webSocketService: WebsocketService,
    private renderer: Renderer2,
  ) {}

  async ngOnInit(): Promise<void> {
    // request data from data-store service
    this.apollo.query({
      query: gql`
        {
          students {
            id
            age
            firstName
            lastName
            dateOfBirth
            gender
            address
            contact
          }
        }
      `,
    }).subscribe((result: any) => {
      console.log(result)
      this.studentData = result?.data?.students;
      this.counter = this.studentData.length;
      this.loading = result.loading;
      this.error = result.error;
    });

    // listen to socket 'events' event (recieve data from notify-system service)
    this.webSocketService.socket.on('events', (data: any) => {
      this.studentData = [...this.studentData, data]; // add data to table
    })

    this.renderer.listen('document', 'click', ({ target }: any) => {
      if (!isChildOf(target, 'k-grid')) {
          this.saveCurrent();
      }
  });
  }

  // upload file method
  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
        this.fileName = file.name;

        const formData = new FormData();
        formData.append("file", file);
        const upload$ = this.http.post("http://localhost:3001/student/upload", formData); // send api post request to upload file to upload-data service
        upload$.subscribe();
    }
  }

  /////////////////////
  public get isInEditingMode(): boolean {
    return this.editedRowIndex !== undefined || this.isNew;
  }

  public addHandler({ sender }: AddEvent): void {
      this.closeEditor(sender);

      this.formGroup = formGroup({
          id: '',
          age: '',
          firstName: '',
          lastName: '',
          contact: '',
          address: '',
          gender: '',
          dateOfBirth: '',
      });

      this.isNew = true;
      sender.addRow(this.formGroup);
  }

  public editHandler({ sender, columnIndex, rowIndex, dataItem }: CellClickEvent): void {
      if (this.formGroup && !this.formGroup.valid) {
          return;
      }

      this.saveRow();
      this.formGroup = formGroup(dataItem);
      this.editedRowIndex = rowIndex;

      sender.editRow(rowIndex, this.formGroup, { columnIndex });
  }

  public cancelHandler(): void {
      this.closeEditor(this.grid, this.editedRowIndex);
  }

  public saveCurrent(): void {
      if (this.formGroup && !this.formGroup.valid) {
          return;
      }
      this.saveRow();
  }

  private closeEditor(grid: GridComponent, rowIndex: any = this.editedRowIndex): void {
      this.isNew = false;
      grid.closeRow(rowIndex);
      this.editedRowIndex = undefined;
      this.formGroup = undefined;
  }

  private saveRow(): void {
      if (this.isInEditingMode) {
          this.save(this.formGroup.value, this.isNew);
      }

      this.closeEditor(this.grid);
  }

  public remove(event: any): void {
    const rowIndex = event.target.parentElement.parentElement.rowIndex;
    const studentDataCopy = [...this.studentData];

    const REMOVE_STUDENT = gql`
      mutation RemoveStudent(
        $id: Int!,
        ) {
        removeStudent(student: {
          id: $id
        }) {
          id
        }
      }
    `;

    // remove
    this.apollo.mutate({
      mutation: REMOVE_STUDENT,
      variables: { id: studentDataCopy[rowIndex].id },
    }).subscribe((response: any) => {
      studentDataCopy.splice(rowIndex, 1);
      this.studentData = studentDataCopy;
    });
  }

  public save(student: any, isNew: boolean): void {
    const CREATE_STUDENT = gql`
      mutation CreateStudent(
        $firstName: String!,
        $lastName: String!,
        $gender: String!,
        $address: String!,
        $contact: String!,
        $dateOfBirth: DateTime!,
        ) {
        createStudent(student: {
          firstName: $firstName
          lastName: $lastName
          gender: $gender
          address: $address
          contact: $contact
          dateOfBirth: $dateOfBirth
        }) {
          id
        }
      }
    `;

    const UPDATE_STUDENT = gql`
      mutation UpdateStudent(
        $id: Int!,
        $firstName: String!,
        $lastName: String!,
        $gender: String!,
        $address: String!,
        $contact: String!,
        $dateOfBirth: DateTime!,
        ) {
        updateStudent(student: {
          id: $id
          firstName: $firstName
          lastName: $lastName
          gender: $gender
          address: $address
          contact: $contact
          dateOfBirth: $dateOfBirth
        }) {
          id
        }
      }
    `;

    if (isNew) {
      // remove unwanted key
      delete student['id'];
      // create
      this.apollo.mutate({
        mutation: CREATE_STUDENT,
        variables: student,
      }).subscribe((response: any) => {
        const studentDataCopy = [...this.studentData];
        studentDataCopy.push({ ...student, id: response?.data?.createStudent?.id });
        this.studentData = studentDataCopy;
      });
    } else {
      // update
      this.apollo.mutate({
        mutation: UPDATE_STUDENT,
        variables: student,
      }).subscribe(() => {
        this.studentData = this.studentData.map((sData) => {
          if (sData.id === student.id) {
            return student;
          }
          return sData;
        });
      });
    }
  }
}
