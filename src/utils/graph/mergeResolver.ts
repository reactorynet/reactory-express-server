

const MergeGraphResolvers = (resolvers: any[] = [])=>{
  let merged = {
    Query: {

    },
    Mutation: {

    }
  };

  resolvers.forEach((resolver) => {
    ['Query', 'Mutation', 'Subscription'].forEach((property) => {
      
      // firt merge the Query and Mutation entries
      if(typeof resolver[property] === 'object') {
        merged[property] = {
          ...merged[property],
          ...resolver[property]
        };
        delete resolver[property];
      }      
    });

    merged = { ...merged, ...resolver };
  });

  return merged;
};

export default MergeGraphResolvers;