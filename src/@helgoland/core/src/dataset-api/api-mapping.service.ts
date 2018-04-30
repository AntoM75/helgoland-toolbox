import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';

export enum DatasetApiVersion {
    V1,
    V2
}

@Injectable()
export class DatasetApiMapping {

    private cache: Map<string, DatasetApiVersion> = new Map<string, DatasetApiVersion>();

    constructor(
        private http: HttpClient
    ) { }

    public getApiVersion(apiUrl: string): Observable<DatasetApiVersion> {
        return new Observable<DatasetApiVersion>((observer: Observer<DatasetApiVersion>) => {
            if (this.cache.has(apiUrl)) {
                this.confirmVersion(observer, this.cache.get(apiUrl));
            } else {
                this.http.get<any[]>(apiUrl).subscribe((result) => {
                    let version = DatasetApiVersion.V1;
                    result.forEach((entry) => {
                        if (entry.id === 'platforms') {
                            version = DatasetApiVersion.V2;
                        }
                    });
                    this.cache.set(apiUrl, version);
                    this.confirmVersion(observer, version);
                });
            }
        });
    }

    private confirmVersion(observer: Observer<DatasetApiVersion>, version: DatasetApiVersion) {
        observer.next(version);
        observer.complete();
    }

}