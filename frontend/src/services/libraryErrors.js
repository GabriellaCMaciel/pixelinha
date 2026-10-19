/** Turns a library error into a sentence a person can act on. */
export function describeLibraryError(error) {
  switch (error?.code) {
    case 'limit_embroideries':
      return 'Você chegou ao limite de 100 bordados salvos. Apague algum para salvar outro.'
    case 'limit_folders':
      return 'Você chegou ao limite de 30 pastas. Apague alguma para criar outra.'
    case 'duplicate_folder':
      return 'Você já tem uma pasta com esse nome. Escolha outro nome.'
    case 'network':
      return 'Não foi possível falar com o servidor. Confira a conexão e tente de novo.'
    case 'unavailable':
      return 'Salvar bordados não está disponível neste momento.'
    default:
      return 'Não deu certo desta vez. Tente de novo em instantes.'
  }
}
