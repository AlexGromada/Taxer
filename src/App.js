import React from 'react';
import Dropzone from 'react-dropzone'
import { useState } from 'react';
import './App.css';
import * as asn1js from 'asn1js';

export default function App() {

  const [state, NewState] = useState("Add More") //Дія виконувана з кожного стану відображається у його назві , тобто коли стан Додати Більше -- при натиску на клавішу ми отримуємо змогу додати більше сертифікатів, а при стані Повернутись -- повертаємось до початкового стану
  function ChangePageState() {
    state === "Add More" ? NewState("Return") : NewState("Add More"); 
  }

  let CertificateStorage = [] // Список , що зберігає у собі данні localStorage для подальшого їх перетворення на об'єкти з використанням методу map
  for(let i = 0; i<localStorage.length; i++){ 
    let key = Object.keys(localStorage)[i]
    let item = localStorage.getItem(`${key}`)
    CertificateStorage.push(JSON.parse(item))
  }

  const [ActualCertificateInfo, setActualCertificateInfo] = useState({}); // Словник що зберігає інформацію сертифікату , який переглядається у данний момент. Саме ця інформація виводиться до об'єкту з класом FullCertificateInfo
  function CertificateFullInfo(CommonName, IssuerCN, ValidFrom, ValidTo, key){
    setActualCertificateInfo({CommonName, IssuerCN, ValidFrom, ValidTo, key})
  }

  function handleDelete(){ // Видалення сертифікату з усіх джерел (localStorage, CertificateStorage, ActualCertificateStorage)
    let key = ActualCertificateInfo.key
    let UpdatedCertificateStorage = CertificateStorage.filter(certificate => certificate.key !== key)
    CertificateStorage = UpdatedCertificateStorage
    localStorage.removeItem(`${key}`)
    setActualCertificateInfo({})
  }

  function DataRead(acceptedFiles) { // зчитування данних усіх отриманих сертифікатів , підтримує можливість додавання 2 та більше сертифікатів одночасно
    acceptedFiles.forEach(file => {
      if(!file.name.toLowerCase().endsWith(".cer")){
        alert("Приймаються тільки файли з розширенням .cer")
      }
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = function(event) {
        const certificateData = new Uint8Array(event.target.result);
        const asn1 = asn1js.fromBER(certificateData);
        if (asn1.offset === -1) {
          console.error("Не вдалося розібрати дані ASN.1");
        } else {
          const decodedResult = asn1.result.valueBlock.value;
          const tbsCertificate = decodedResult[0];
          const IssuerArray = tbsCertificate.valueBlock.value[3].valueBlock.value;
          const SubjectArray = tbsCertificate.valueBlock.value[5].valueBlock.value;
          let IssuedTo = findPersonDataByOID(SubjectArray, "2.543");
          let IssuedBy = findPersonDataByOID(IssuerArray, "2.543");
          const ValidationArray = tbsCertificate.valueBlock.value[4].valueBlock.value;
          const ValidFrom = `${ValidationArray[0].day}/${ValidationArray[0].month}/${ValidationArray[0].year} (${ValidationArray[0].hour}:${ValidationArray[0].minute}${ValidationArray[0].second} UTC)`;
          const ValidTo = `${ValidationArray[1].day}/${ValidationArray[1].month}/${ValidationArray[1].year} (${ValidationArray[1].hour}:${ValidationArray[1].minute}${ValidationArray[1].second} UTC)`;   
          function findPersonDataByOID(array, oid){
            for (let i=0; i<array.length; i++){
              let OIDArray = array[i].valueBlock.value[0].valueBlock.value[0].valueBlock.value;
              let OID = OIDArray[0].toString()+OIDArray[1].toString()+OIDArray[2].toString()
              if(OID === oid){
                return array[i].valueBlock.value[0].valueBlock.value[1].valueBlock.value;
              }
            }
          }
          let key = Math.floor((Math.random()+1)*500000000)
          const CertificateInfo = {"IssuedTo":IssuedTo, "IssuedBy":IssuedBy, "ValidFrom":ValidFrom, "ValidTo":ValidTo, "key":key};
          const CertificateInfoString = JSON.stringify(CertificateInfo);
          localStorage.setItem(`${key}`, `${CertificateInfoString}`)
        }
      };
    });
  }

  return (
    <div className="App">
      <div className='ButtonAndListContainer'>
        <button onClick={ChangePageState}>
          {state === "Add More"? "Add More" : "Return"}
        </button>
        <div className={state === "Return" ? "none" : "CertificateList"}>
          <p className={CertificateStorage.length === 0 ? "" : "none"}>Жодних сертефікатів</p>
          {CertificateStorage.map(certificate => (<div onClick={() => CertificateFullInfo(certificate.IssuedTo, certificate.IssuedBy, certificate.ValidFrom, certificate.ValidTo, certificate.key)} key={certificate.key} className='CertificateObject'><p>{certificate.IssuedTo}</p></div>))}
        </div>
      </div>
      <div className={state === "Return" ? "Dropzone" : "none"}>
        <Dropzone  onDrop={acceptedFiles => DataRead(acceptedFiles)}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()}/>
              Drag 'n' drop some files here, or click to select files
              <button className='DropzoneButton'>Upload File</button>
            </div>
          )}
        </Dropzone>
      </div>
      <div className={state === "Add More" && Object.keys(ActualCertificateInfo).length !== 0 ? "CertificateFullInfo" : "none"}>
        <p>Common Name: {ActualCertificateInfo.CommonName}</p>
        <p>Issuer CN: {ActualCertificateInfo.IssuerCN}</p>
        <p>Valid From: {ActualCertificateInfo.ValidFrom}</p>
        <p>Valid To: {ActualCertificateInfo.ValidTo}</p>
        <button className="DeleteButton" onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );      
}