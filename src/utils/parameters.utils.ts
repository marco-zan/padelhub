import { sendHTTPResponse } from "./general.utils";
import { Response } from "express"
import { logger } from "./logging";
import { DateTime } from "luxon";

/*
 *
 *  Come funzionano i controlli di questo modulo:
 *
 *  Parametro:
 *    - res: Oggetto Response di express
 *    - value: Il valore da controllare
 *
 *    - ...: Parametri opzionali per ogni funzione specifica, commentati separatamente
 *
 *    - error_message: "Intestazione" dell'errore, indica l'ambito in cui `e successo, come ad
 *                     esempio "Iscrizione fallita"
 *    - value_name: il nome del campo che ha fallito il suo controllo, ad esempio "nome"
 */

export function controlloStringa(res: Response, value: any, ok_empty = false, error_message: string, value_name?: string){
    /*
     * ok_empty: se e` false, significa che le stringhe vuote saranno considerate invalide
     */

    if ( !value || typeof value !== "string" || ( !ok_empty && value === "")){
        let msg = `${error_message}: ${ value_name || "Un valore inserito" } invalido`;

        sendHTTPResponse(res, 400, false, msg)
        return null
    }
    return value
}

export function controlloRegExp(res: Response, value: any, ok_empty: boolean, regExp: RegExp, error_message: string, value_name?: string) {
    /*
     * ok_empty: come sopra, se e` false, significa che la stringa 'value', se vuota, sara`` considerata invalida
     * regExp: e` la vera regexp sulla quale la stringa sara` controllata
     */

    if( !controlloStringa(res, value, ok_empty, error_message, value_name) ) return null;

    if( ! regExp.test(value as string)  ) {

        let msg = `${error_message}: ${ value_name || "Un valore inserito" } invalido`;

        logger.debug(`Fallito controllo regexp di ${value_name}, provato: ${value}`)

        sendHTTPResponse(res, 400, false, msg)
        return null;
    }
    return value as string;
}

export function controlloNomeCognome(res: Response, value: any, ok_empty: boolean, error_message: string, value_name?: string ) {

    if ( !controlloRegExp(
        res,
        value,
        ok_empty,
        /^[A-Za-z]{2,30}$/,
        error_message,
        value_name || "nome / cognome"
    ) )
        return null;

    else
        return value as string
}

export function controlloNickname(res: Response, value: any, ok_empty: boolean, error_message: string) {

    if ( !controlloRegExp(
        res,
        value,
        ok_empty,
        /^[a-zA-Z0-9\-\_]{6,18}$/,
        error_message,
        "Nickname"
    ) )
        return null;

    else
        return value as string
}

export function controlloData(res: Response, value: any, error_message: string, value_name?: string){

    if( !controlloStringa(res, value, false, error_message, value_name) ) return null;

    const date = DateTime.fromISO(value)

    if( !date.isValid ){
        let msg = `${error_message}: ${ value_name || "Una data inserita" } non e' valida`;

        sendHTTPResponse(res, 400, false, msg)
        return null
    }

    return new Date(value);
}

export function controlloInt(res: Response, value: any, minVal: number, maxVal: number, ok_borders: boolean, error_message: string, value_name?: string) {

    const intVal = parseInt(value)

    if (
        isNaN(intVal) ||
        ( ok_borders == false && minVal === intVal ) ||
        ( ok_borders == false && maxVal === intVal ) ||
        intVal < minVal ||
        intVal > maxVal
    ){
        let msg = `${error_message}: ${ value_name || "Un numero / valore inserito" } invalido`;

        sendHTTPResponse(res, 400, false, msg)
        return null
    }
    return intVal
}

export function controlloStrEnum(res: Response, value: any, enum_to_check: { [_: string]: string }, error_message: string, value_name?: string) {

    if ( !controlloStringa(res, value, false, error_message) ) return null;

    if ( !( ( value as string ) in enum_to_check ) ) {
        let msg = `${error_message}: ${ value_name || "Un numero / valore inserito" } invalido`;

        sendHTTPResponse(res, 400, false, msg)
        return null
    }
    return enum_to_check[value as string];
}

export function controlloEmail(res:Response, value: any, error_message: string, value_name?: string){

    //Se non è una stringa e se è vuota
    if( !controlloStringa(res, value, false, error_message, value_name)) return null

    //Se l'email non rispetta il regex
    if(!(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value))){
        let msg = `${error_message}: ${ value_name || "L'email inserita" } non e' valida`;

        sendHTTPResponse(res, 400, false, msg)
        return null
    }
    
    //Controllo se l'email esiste già
    //Controllo se il nome del circolo esiste già
    return value as string

}

export function controlloTelefono(res:Response, value: any, error_message: string, value_name?: string){

    //Se non è una stringa e se è vuota 
    if( !controlloStringa(res, value, false, error_message, value_name)) return null

    //Se non rispetta il formato di un telephone number
    if(!(/^(3[0-9]{8,9})|(0{1}[1-9]{1,3})[\s|.|-]?(\d{4,})$/.test(value))){
        let msg = `${error_message}: ${ value_name || "numero di telefono inserito" } invalido`;

        sendHTTPResponse(res, 400, false, msg)
        return null        
    }

    return value as string;

}


export function controlloPassword(res:Response, value: any, error_message: string, value_name?: string){

    //Se non è una stringa e se è vuota 
    if( !controlloStringa(res, value, false, error_message, value_name)) return null

    //Controllo se rispetta il regex
    if( !(/^(?=.[a-z])(?=.[A-Z])(?=.\d)(?=.[@$!%?&])[A-Za-z\d@$!%?&]{8,}$/).test(value)){
        let msg = `${error_message}: ${ value_name || "La password inserita" } non valida`;

        sendHTTPResponse(res, 400, false, msg)
        return null  
    }

    return value as string;

}