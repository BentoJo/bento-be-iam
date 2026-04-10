export interface RegisterOTPResponse{
    verified : boolean; 
    nextStep : 'complete_profile';
    tempToken : string ;
}