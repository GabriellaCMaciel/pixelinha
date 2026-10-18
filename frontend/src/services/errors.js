const MB = 1024 * 1024

/**
 * Plain-language message for an ApiError, in Portuguese.
 * The server sends a stable `code`; the wording lives here.
 */
export function describeError(error) {
  const details = error?.details ?? {}

  switch (error?.code) {
    case 'invalid_grid_width':
      return `A largura precisa ficar entre ${details.min} e ${details.max} pontos.`
    case 'invalid_colors':
      return `O número de cores precisa ficar entre ${details.min} e ${details.max}.`
    case 'invalid_fabric_count':
      return 'Esse tecido não está disponível. Escolha uma das contagens da lista.'
    case 'invalid_style':
      return 'Esse estilo de PDF não existe. Escolha colorido ou preto e branco.'
    case 'file_too_large':
      return `O arquivo passa de ${Math.round(details.max_bytes / MB)} MB. Escolha uma imagem menor.`
    case 'image_too_large':
      return 'Esta imagem tem pixels demais. Reduza o tamanho dela e tente de novo.'
    case 'unsupported_format':
      return 'Formato não suportado. Use uma imagem PNG, JPG ou WEBP.'
    case 'corrupted_image':
      return 'Não foi possível ler este arquivo. Ele pode estar corrompido; exporte a imagem de novo e tente outra vez.'
    case 'too_many_stitches':
      return `Com esta imagem, o gráfico teria pontos demais. Use uma largura de até ${details.max_grid_width} pontos.`
    case 'nothing_to_stitch':
      return 'Só sobrou o fundo, então não há o que bordar. Aumente o número de cores: para um desenho de uma cor só, use 2.'
    case 'background_not_in_palette':
      return 'Essa linha não está mais no gráfico. Volte a bordar o fundo e escolha de novo.'
    case 'network':
      return 'Não foi possível falar com o servidor. Confira a conexão e tente de novo. Se o servidor estava parado, a primeira tentativa pode levar cerca de 1 minuto.'
    case 'server':
      return 'O servidor teve um problema. Tente de novo em instantes.'
    default:
      return 'Não foi possível gerar o gráfico. Tente de novo.'
  }
}
