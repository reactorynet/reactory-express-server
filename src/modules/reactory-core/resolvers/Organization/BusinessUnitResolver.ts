import { resolver, query, mutation, property } from '@reactory/server-core/models/graphql/decorators/resolver';
import { BusinessUnit, Organization, User, Organigram } from '@reactory/server-modules/reactory-core/models';
import { OrganizationNotFoundError, BusinessUnitExistsError, ValidationError, RecordNotFoundError } from '@reactory/server-core/exceptions';

//@ts-ignore - this has to be called without the () as this throws an error in the decorator
@resolver
class BusinessUnitResolver {
  @property('BusinessUnit', 'id')
  id(bu: any) {
    return bu._id ? bu._id.toString() : null;
  }

  @property('BusinessUnit', 'organization')
  async organization(bu: any) {
    if (bu.organization) {
      return Organization.findById(bu.organization).then();
    }
    return null;
  }

  @property('BusinessUnit', 'owner')
  async owner(bu: any) {
    if (bu.owner) return User.findById(bu.owner).then();
    return null;
  }

  @property('BusinessUnit', 'members')
  async members(bu: any) {
    if (bu.members) {
      return Promise.all(bu.members.map((m: any) => User.findById(m).then()));
    }
    return [];
  }

  @query('businessUnitsForOrganization')
  async businessUnitsForOrganization(parent: any, args: any) {
    const { id, searchString } = args;
    const organization = await Organization.findById(id).then();
    if (organization) {
      const query: any = { organization: organization._id };
      if (searchString) {
        query.name = new RegExp(`${searchString}`, 'g');
      }
      return BusinessUnit.find(query).then();
    }
    throw new OrganizationNotFoundError('Could not locate the organization with the given id', 'Organization');
  }

  @query('businessUnitWithId')
  async businessUnitWithId(parent: any, args: any) {
    const { id } = args;
    return BusinessUnit.findById(id).then();
  }

  @mutation('createBusinessUnit')
  async createBusinessUnit(obj: any, args: any) {
    const { input } = args;
    if (input.organization) {
      const organization = await Organization.findById(input.organization).then();
      if (!organization) throw new OrganizationNotFoundError('Could not locate the organization with id in the input', 'Organization');
      const buExists = await BusinessUnit.count({ organization: organization._id, name: input.name }).then() === 1;
      if (buExists === true) throw new BusinessUnitExistsError('Could not create the business with that name as it already exists for the organization');
      let businessUnit = new BusinessUnit(input);
      businessUnit = await businessUnit.save().then();
      return businessUnit;
    }
    throw new ValidationError('Could not validate the input');
  }

  @mutation('updateBusinessUnit')
  async updateBusinessUnit(parent: any, args: any) {
    const { id, input } = args;
    if (id && input) {
      return BusinessUnit.findByIdAndUpdate(id, input).then();
    }
    return null;
  }

  @mutation('addMemberToBussinessUnit')
  async addMemberToBussinessUnit(parent: any, args: { id: any, memberId: any }) {
    const { id, memberId } = args;
    const businessUnit = await BusinessUnit.findById(id).then();
    const user = await User.findById(memberId).then();
    if (businessUnit && user) {
      const organigram = await Organigram.findOne({ user: user.id, organization: businessUnit.organization }).then();
      if (organigram) {
        organigram.businessUnit = businessUnit.id;
        await organigram.save().then();
      }
      return true;
    } else {
      throw new RecordNotFoundError('Could not find the member or business unit');
    }
  }

  @mutation('removeMemberFromBusinessUnit')
  async removeMemberFromBusinessUnit(parent: any, args: { id: any, memberId: any }) {
    const { id, memberId } = args;
    const businessUnit = await BusinessUnit.findById(id).then();
    const user = await User.findById(memberId).then();
    if (businessUnit && user) {
      const organigram = await Organigram.findOne({ user: user.id, organization: businessUnit.organization, businessUnit: id }).then();
      if (organigram) {
        organigram.businessUnit = null;
        await organigram.save().then();
      }
      return true;
    } else {
      throw new RecordNotFoundError('Could not find the member or business unit');
    }
  }

  @query('ReactoryBusinessUnits')
  async ReactoryBusinessUnits(parent: any, args: any) {
    try {
      const { query } = args;
      const { paging, filter } = query || {};
      const dbQuery: any = {};
      if (filter) {
        if (filter.organizationId) dbQuery.organization = filter.organizationId;
        if (filter.name) dbQuery.name = new RegExp(filter.name, 'i');
      }
      const page = paging?.page || 1;
      const pageSize = paging?.pageSize || 25;
      const skip = (page - 1) * pageSize;
      const [businessUnits, total] = await Promise.all([
        BusinessUnit.find(dbQuery).skip(skip).limit(pageSize).then(),
        BusinessUnit.countDocuments(dbQuery).then(),
      ]);
      return {
        __typename: 'ReactoryPagedBusinessUnits',
        businessUnits,
        paging: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize),
          hasNext: (page * pageSize) < total,
        },
      };
    } catch (err: any) {
      return {
        __typename: 'ReactoryBusinessUnitsQueryFailed',
        message: err.message || 'Failed to fetch business units',
        code: 'ERR_BUSINESS_UNITS_QUERY',
      };
    }
  }
}

export default BusinessUnitResolver;
