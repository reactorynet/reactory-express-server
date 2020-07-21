export const LasecUserTitleList = `query LasecGetPersonTitles {
    LasecGetPersonTitles {
      id
      title
    }
  }`;

export const LasecGetPersonTitleById = `
  query LasecGetPersonTitleById(id String) {
      id
      title
  }
`;