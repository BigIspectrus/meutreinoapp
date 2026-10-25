import fs from 'node:fs';

// Windows exige um descritor gravável para FlushFileBuffers (fsync).
// O destino só é substituído depois de gravar, confirmar e fechar o temporário.
export function writeJsonAtomic(target,data){
  const temporary=target+'.tmp',fd=fs.openSync(temporary,'w',0o600);
  try{fs.writeFileSync(fd,JSON.stringify(data),{encoding:'utf8'});fs.fsyncSync(fd);}
  finally{fs.closeSync(fd);}
  fs.renameSync(temporary,target);
}
